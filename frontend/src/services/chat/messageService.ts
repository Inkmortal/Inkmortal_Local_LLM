/**
 * Message services for chat functionality
 */
import { fetchApi } from '../../config/api';
import { 
  ChatRequestParams, 
  ChatResponse, 
  MessageStatus, 
  ChatMode,
  MessageStreamHandlers,
  MessageUpdateEvent
} from './types';
import { 
  createErrorResponse, 
  executeServiceCall,
  handleApiResponse 
} from './errorHandling';
import {
  registerMessageHandler,
  isWebSocketConnected,
  ensureWebSocketConnection,
  addConnectionListener
} from './websocketService';

// Track WebSocket availability
let webSocketAvailable = false;

// Initialize connection listener
addConnectionListener((connected) => {
  webSocketAvailable = connected;
  console.log(`WebSocket connection state changed: ${connected ? 'connected' : 'disconnected'}`);
});

/**
 * Sends a message to the LLM backend using the polling approach
 * @param params Request parameters including message and optional conversation ID and file
 * @returns Promise with the chat response
 */
export async function sendMessagePolling(params: ChatRequestParams): Promise<ChatResponse> {
  return executeServiceCall(
    async () => {
      console.log('Using polling mode for message');
      
      // Prepare request based on whether we have a file
      const endpoint = '/api/chat/message';
      let requestOptions: RequestInit;
      
      if (params.file) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('message', params.message);
        formData.append('file', params.file);
        
        if (params.conversation_id) {
          formData.append('conversation_id', params.conversation_id);
        }
        
        requestOptions = {
          method: 'POST',
          body: formData,
          // Don't set Content-Type for FormData
        };
      } else {
        // Regular JSON request for text-only messages
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: params.message,
            conversation_id: params.conversation_id,
          }),
        };
      }
      
      // Make API request
      const response = await fetchApi<ChatResponse>(endpoint, requestOptions);
      console.log(`Message API response status: ${response.status}`);
      
      // Use our enhanced error handler
      const result = handleApiResponse(response, {
        title: 'Message Error',
        notifyOnError: true
      });
      
      console.log(`Message API result:`, result);
      
      // Return appropriate response based on success/failure
      if (result.success && result.data) {
        return {
          ...result.data,
          status: MessageStatus.COMPLETE
        };
      } else {
        return createErrorResponse(response, params.conversation_id);
      }
    },
    createErrorResponse('Failed to send message due to an unexpected error', params.conversation_id)
  );
}

/**
 * Sends a message with WebSocket status updates
 */
export async function sendMessageStreaming(
  params: ChatRequestParams,
  handlers: MessageStreamHandlers
): Promise<void> {
  if (!webSocketAvailable) {
    console.log('WebSocket not available for streaming, falling back to polling');
    fallbackToPolling(params, handlers);
    return;
  }
  
  try {
    console.log('Using WebSocket streaming mode');
    handlers.onStart?.();
    
    // Send the initial message using the REST API
    // The WebSocket will then provide status updates
    const response = await executeServiceCall(
      async () => {
        // Prepare the request
        const endpoint = '/api/chat/message';
        let requestOptions: RequestInit;
        
        if (params.file) {
          // Use FormData for file uploads
          const formData = new FormData();
          formData.append('message', params.message);
          formData.append('file', params.file);
          
          if (params.conversation_id) {
            formData.append('conversation_id', params.conversation_id);
          }
          
          requestOptions = {
            method: 'POST',
            body: formData,
          };
        } else {
          // Regular JSON request
          requestOptions = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: params.message,
              conversation_id: params.conversation_id,
            }),
          };
        }
        
        // Send the initial request
        const response = await fetchApi<ChatResponse>(endpoint, requestOptions);
        
        // Handle API response
        const result = handleApiResponse(response);
        if (result.success && result.data) {
          return result.data;
        } else {
          throw new Error(result.error || 'Failed to send message');
        }
      },
      null
    );
    
    if (!response) {
      console.error('No response from message API');
      handlers.onError?.('Failed to send message');
      return;
    }
    
    // Register for WebSocket updates for this message
    const messageId = response.id;
    
    // Set a maximum timeout to fallback to polling if WebSocket updates never arrive
    let statusChecker: { cancel: () => void } | null = null;
    const timeoutId = setTimeout(() => {
      console.warn('WebSocket updates timed out, checking message status via API');
      statusChecker = checkMessageStatus(messageId, params.conversation_id, handlers);
    }, 10000); // 10 seconds
    
    // Register handler for WebSocket updates
    let unregisterHandler = registerMessageHandler(messageId, (update: MessageUpdateEvent) => {
      // Convert status string to enum if needed
      let status: MessageStatus;
      if (update.status === 'QUEUED') status = MessageStatus.QUEUED;
      else if (update.status === 'PROCESSING') status = MessageStatus.PROCESSING;
      else if (update.status === 'STREAMING') status = MessageStatus.STREAMING;
      else if (update.status === 'COMPLETE') status = MessageStatus.COMPLETE;
      else if (update.status === 'ERROR') status = MessageStatus.ERROR;
      else status = MessageStatus.SENDING;
      
      // Handle different statuses
      if (status === MessageStatus.QUEUED || status === MessageStatus.PROCESSING) {
        // Update queue position
        handlers.onStatusUpdate?.(status, update.queue_position);
      }
      else if (status === MessageStatus.STREAMING) {
        // Clear timeout as we're getting updates
        clearTimeout(timeoutId);
        if (statusChecker) statusChecker.cancel();
        
        // Start streaming mode
        handlers.onStatusUpdate?.(MessageStatus.STREAMING);
      }
      else if (status === MessageStatus.COMPLETE && update.assistant_content) {
        // Clear timeout as we're complete
        clearTimeout(timeoutId);
        if (statusChecker) statusChecker.cancel();
        
        // Create complete response object
        const completeResponse: ChatResponse = {
          id: update.assistant_message_id || messageId,
          conversation_id: update.conversation_id,
          content: update.assistant_content,
          created_at: new Date().toISOString(),
          role: 'assistant',
          status: MessageStatus.COMPLETE
        };
        
        // Handle streaming content with significant optimizations
        if (handlers.onToken && update.assistant_content.length > 0) {
          try {
            const content = update.assistant_content;
            
            // Improved adaptive batch sizing based on content length
            const contentLength = content.length;
            const batchCount = contentLength < 500 ? 10 : (contentLength < 2000 ? 15 : 20);
            const batchSize = Math.max(10, Math.ceil(contentLength / batchCount));
            
            // Use a single immediate batch for very short content to avoid overhead
            if (contentLength < 100) {
              if (handlers.onToken) {
                handlers.onToken(content);
              }
              handlers.onComplete?.(completeResponse);
              unregisterHandler();
              return;
            }
            
            // Use animation frames for smoother visual updates
            let position = 0;
            let animationFrameId: number | null = null;
            let isStreamingCancelled = false;
            
            // Single function for updates to avoid nested timeouts
            const updateNextBatch = () => {
              // If streaming was cancelled, clean up and exit
              if (isStreamingCancelled) return;
              
              // Break out early if we're done
              if (position >= contentLength) {
                handlers.onComplete?.(completeResponse);
                unregisterHandler();
                return;
              }
              
              // Calculate next chunk with bounds checking
              const end = Math.min(position + batchSize, contentLength);
              const chunk = content.substring(position, end);
              position = end;
              
              // Send the batch
              if (handlers.onToken) {
                handlers.onToken(chunk);
              }
              
              // Percentage-based delay - slower at start, faster at end
              const percentComplete = position / contentLength;
              const adaptiveDelay = Math.max(5, 30 * (1 - percentComplete));
              
              // Schedule next batch using a single mechanism
              animationFrameId = window.requestAnimationFrame(() => {
                setTimeout(() => {
                  animationFrameId = null;
                  updateNextBatch();
                }, adaptiveDelay);
              });
            };
            
            // Start streaming with initial call
            updateNextBatch();
            
            // Attach cleanup to our handler to prevent memory leaks
            const originalUnregister = unregisterHandler;
            unregisterHandler = () => {
              // Cancel any pending animation frames
              if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
              }
              
              // Mark streaming as cancelled to prevent further updates
              isStreamingCancelled = true;
              
              // Call original unregister function
              originalUnregister();
            };
          } catch (error) {
            // In case of error during streaming, fall back to simple completion
            console.error('Error during streaming:', error);
            handlers.onComplete?.(completeResponse);
            unregisterHandler();
          }
        } else {
          // Directly call complete handler without streaming
          handlers.onComplete?.(completeResponse);
          unregisterHandler();
        }
      }
      else if (status === MessageStatus.ERROR) {
        // Clear timeout as we have an error
        clearTimeout(timeoutId);
        if (statusChecker) statusChecker.cancel();
        
        // Handle error
        handlers.onError?.(update.error || 'Unknown error');
        unregisterHandler();
      }
    });
    
  } catch (error) {
    console.error('Error in streaming mode:', error);
    handlers.onError?.(error instanceof Error ? error.message : 'Unknown error');
    
    // Fallback to polling as last resort
    fallbackToPolling(params, handlers);
  }
}

/**
 * Fallback to polling when WebSocket is not available
 */
async function fallbackToPolling(
  params: ChatRequestParams,
  handlers: MessageStreamHandlers
): Promise<void> {
  console.log('Falling back to polling mode');
  
  try {
    // Call onStart if not already called
    handlers.onStart?.();
    
    // Update status to queued
    handlers.onStatusUpdate?.(MessageStatus.QUEUED);
    
    // Use polling to get response
    const response = await sendMessagePolling(params);
    
    if (response.status === MessageStatus.ERROR) {
      handlers.onError?.(response.error || 'Unknown error');
    } else {
      // Lightweight streaming implementation for polling fallback
      if (handlers.onToken && response.content.length > 0) {
        const content = response.content;
        const contentLength = content.length;
        
        // For very short content, just send it all at once
        if (contentLength < 100) {
          handlers.onToken(content);
        } else {
          // Use simplified batching approach without async/await
          // This avoids potential promise chain issues and memory leaks
          const batchCount = contentLength < 500 ? 5 : (contentLength < 2000 ? 10 : 15);
          const batchSize = Math.max(10, Math.ceil(contentLength / batchCount));
          
          let position = 0;
          let isStreamingCancelled = false;
          
          // Function for batched updates without async
          const processNextBatch = () => {
            if (isStreamingCancelled || position >= contentLength) {
              return;
            }
            
            // Calculate next chunk
            const end = Math.min(position + batchSize, contentLength);
            const chunk = content.substring(position, end);
            position = end;
            
            // Send chunk to handler
            if (handlers.onToken) {
              handlers.onToken(chunk);
            }
            
            // If we're done, exit
            if (position >= contentLength) {
              return;
            }
            
            // Schedule next batch with simple setTimeout
            window.setTimeout(() => {
              window.requestAnimationFrame(processNextBatch);
            }, 20);
          };
          
          // Start processing
          processNextBatch();
          
          // Wait for completion (for async compatibility)
          await new Promise<void>(resolve => {
            const checkInterval = setInterval(() => {
              if (position >= contentLength) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 50);
            
            // Timeout after 5s in case something goes wrong
            setTimeout(() => {
              clearInterval(checkInterval);
              isStreamingCancelled = true;
              resolve();
            }, 5000);
          });
        }
      }
      
      // Mark as complete
      handlers.onComplete?.(response);
    }
  } catch (error) {
    console.error('Error in polling fallback:', error);
    handlers.onError?.(error instanceof Error ? error.message : 'Unknown error');
  }
}

// Maximum number of polling attempts to prevent infinite loops
const MAX_POLLING_ATTEMPTS = 15; // ~30 seconds max polling time
const POLLING_DELAY_MS = 2000; // 2 seconds between polls

/**
 * Check message status via API when WebSocket updates are not received
 * Uses a cancel token pattern to prevent stale callbacks
 */
function checkMessageStatus(
  messageId: string,
  conversationId: string | undefined,
  handlers: MessageStreamHandlers,
  attempt: number = 0
): { cancel: () => void } {
  // Create cancel token
  let isCancelled = false;
  
  // Function to check status with retry limit
  const checkStatus = async () => {
    // Return early if cancelled or max attempts reached
    if (isCancelled || attempt >= MAX_POLLING_ATTEMPTS) {
      if (attempt >= MAX_POLLING_ATTEMPTS) {
        handlers.onError?.('Message processing timeout. Please try again later.');
      }
      return;
    }
    
    try {
      // Make API request for message status
      const response = await fetchApi<{ status: string; queue_position: number | null }>(
        `/api/chat/message/${messageId}/status`,
        { method: 'GET' }
      );
      
      // Skip further processing if cancelled during API call
      if (isCancelled) return;
      
      const result = handleApiResponse(response);
      if (!result.success || !result.data) {
        handlers.onError?.(result.error || 'Failed to check message status');
        return;
      }
      
      const { status, queue_position } = result.data;
      
      // Handle different status cases
      if (status === 'QUEUED') {
        handlers.onStatusUpdate?.(MessageStatus.QUEUED, queue_position);
        scheduleNextPoll();
      }
      else if (status === 'PROCESSING') {
        handlers.onStatusUpdate?.(MessageStatus.PROCESSING, 0);
        scheduleNextPoll();
      }
      else if (status === 'COMPLETE') {
        await handleComplete();
      }
      else {
        // Unknown status, try again
        scheduleNextPoll();
      }
    } catch (error) {
      // Skip error handling if cancelled
      if (isCancelled) return;
      
      console.error('Error checking message status:', error);
      
      // For network errors, retry; for other errors, fail
      if (error instanceof Error && error.message.includes('network')) {
        scheduleNextPoll();
      } else {
        handlers.onError?.(error instanceof Error ? error.message : 'Unknown error');
      }
    }
  };
  
  // Schedule next poll with incremented attempt counter
  const scheduleNextPoll = () => {
    if (isCancelled || attempt >= MAX_POLLING_ATTEMPTS) return;
    
    setTimeout(() => {
      if (!isCancelled) {
        checkStatus();
      }
    }, POLLING_DELAY_MS);
  };
  
  // Handle completion status
  const handleComplete = async () => {
    if (isCancelled) return;
    
    try {
      // Fetch conversation to get assistant response
      const convResponse = await fetchApi<any>(
        `/api/chat/conversation/${conversationId}`,
        { method: 'GET' }
      );
      
      // Skip if cancelled during API call
      if (isCancelled) return;
      
      const convResult = handleApiResponse(convResponse);
      if (!convResult.success || !convResult.data) {
        handlers.onError?.('Failed to get conversation');
        return;
      }
      
      // Find assistant message
      const messages = convResult.data.messages;
      const assistantMessages = messages.filter((msg: any) => msg.role === 'assistant');
      
      if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[assistantMessages.length - 1];
        
        // Complete operation with response
        handlers.onComplete?.({
          id: lastMessage.id,
          conversation_id: conversationId || '',
          content: lastMessage.content,
          created_at: lastMessage.created_at,
          role: 'assistant',
          status: MessageStatus.COMPLETE
        });
      } else {
        handlers.onError?.('No assistant response found');
      }
    } catch (error) {
      // Skip error handling if cancelled
      if (isCancelled) return;
      
      console.error('Error fetching complete conversation:', error);
      handlers.onError?.(error instanceof Error ? error.message : 'Failed to get message');
    }
  };
  
  // Start the polling process
  checkStatus();
  
  // Return cancel function
  return {
    cancel: () => {
      isCancelled = true;
    }
  };
}

/**
 * Main message sending function that chooses the appropriate implementation
 * @param params Request parameters including message and optional conversation ID and file
 * @returns Promise with the chat response
 */
export async function sendMessage(
  message: string, 
  conversationId?: string, 
  file?: any, 
  options?: {mode?: ChatMode}
): Promise<ChatResponse> {
  console.log(`MessageService: Sending message with conversation ID: ${conversationId}`);
  
  // Construct params object
  const params: ChatRequestParams = {
    message,
    conversation_id: conversationId,
    file: file ? file : undefined,
    mode: options?.mode || ChatMode.STREAMING
  };
  
  if (params.mode === ChatMode.STREAMING) {
    try {
      console.log('Attempting to use streaming mode');
      
      // Get auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found, falling back to polling');
        return sendMessagePolling(params);
      }
      
      // Check if WebSocket is available or can be connected
      if (!webSocketAvailable) {
        const connected = await ensureWebSocketConnection(token);
        webSocketAvailable = connected;
        
        if (!connected) {
          console.log('WebSocket connection failed, falling back to polling');
          return sendMessagePolling(params);
        }
      }
      
      // Use streaming implementation via Promise
      return new Promise((resolve, reject) => {
        // Set timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.error('Streaming timed out, falling back to polling');
          // Clear handlers to avoid double resolution
          const originalHandlers = { ...handlers };
          handlers.onComplete = undefined;
          handlers.onError = undefined;
          
          // Fall back to polling
          sendMessagePolling(params)
            .then(resolve)
            .catch(reject);
        }, 30000); // 30 second timeout
        
        // Define handlers
        const handlers: MessageStreamHandlers = {
          onComplete: (response) => {
            clearTimeout(timeoutId);
            resolve(response);
          },
          onError: (error) => {
            clearTimeout(timeoutId);
            console.warn('Streaming error, falling back to polling:', error);
            
            // Try polling as fallback for errors
            sendMessagePolling(params)
              .then(resolve)
              .catch(reject);
          }
        };
        
        // Start streaming
        sendMessageStreaming(params, handlers);
      });
    } catch (error) {
      console.warn('WebSocket error, falling back to polling:', error);
      return sendMessagePolling(params);
    }
  } else {
    // Use polling implementation
    console.log('Using polling message mode (explicitly requested)');
    return sendMessagePolling(params);
  }
}