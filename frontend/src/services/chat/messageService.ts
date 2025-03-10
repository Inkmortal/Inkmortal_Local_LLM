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
      
      // Use our enhanced error handler
      const result = handleApiResponse(response, {
        title: 'Message Error',
        notifyOnError: true
      });
      
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
    const unregisterHandler = registerMessageHandler(messageId, (update: MessageUpdateEvent) => {
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
        
        // Handle streaming content if needed
        if (handlers.onToken && update.assistant_content.length > 0) {
          // Use a more efficient batched token streaming approach
          const content = update.assistant_content;
          const batchSize = Math.max(5, Math.floor(content.length / 100)); // Dynamic batch size
          
          let position = 0;
          let timeoutId: number | null = null;
          
          const streamNextBatch = () => {
            // Clear previous timeout if exists
            if (timeoutId !== null) {
              window.clearTimeout(timeoutId);
            }
            
            // Stop if we're done
            if (position >= content.length) {
              handlers.onComplete?.(completeResponse);
              unregisterHandler();
              return;
            }
            
            // Calculate next position
            const end = Math.min(position + batchSize, content.length);
            const batch = content.substring(position, end);
            
            // Send token batch to handler
            if (handlers.onToken) {
              handlers.onToken(batch);
            }
            
            // Update position
            position = end;
            
            // Schedule next batch using requestAnimationFrame for better performance
            timeoutId = window.setTimeout(() => {
              window.requestAnimationFrame(streamNextBatch);
            }, 10);
          };
          
          // Start streaming
          streamNextBatch();
        } else {
          // Directly call complete handler
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
      // Use the same batched streaming approach as with WebSockets
      if (handlers.onToken && response.content.length > 0) {
        const content = response.content;
        const batchSize = Math.max(5, Math.floor(content.length / 100));
        
        let position = 0;
        
        // Use a more controlled streaming approach with requestAnimationFrame
        const streamBatches = async () => {
          while (position < content.length) {
            const end = Math.min(position + batchSize, content.length);
            const batch = content.substring(position, end);
            
            handlers.onToken(batch);
            position = end;
            
            // Short delay between batches for visual effect
            await new Promise(resolve => setTimeout(resolve, 10));
            // Use requestAnimationFrame to align with browser rendering
            await new Promise(resolve => requestAnimationFrame(() => resolve(true)));
          }
        };
        
        await streamBatches();
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
export async function sendMessage(params: ChatRequestParams): Promise<ChatResponse> {
  // Get user's preferred mode, defaulting to streaming if not specified
  const mode = params.mode || ChatMode.STREAMING;
  
  if (mode === ChatMode.STREAMING) {
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