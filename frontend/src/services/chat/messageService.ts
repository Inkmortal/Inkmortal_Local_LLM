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
  initializeWebSocket
} from './websocketService';

/**
 * Sends a message to the LLM backend using the polling approach
 * @param params Request parameters including message and optional conversation ID and file
 * @returns Promise with the chat response
 */
export async function sendMessagePolling(params: ChatRequestParams): Promise<ChatResponse> {
  return executeServiceCall(
    async () => {
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
 * Sends a message using WebSockets for real-time status updates
 */
export async function sendMessageStreaming(
  params: ChatRequestParams,
  handlers: MessageStreamHandlers
): Promise<void> {
  handlers.onStart?.();
  
  try {
    // Get authentication token from localStorage
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }
    
    // Ensure WebSocket is connected
    if (!isWebSocketConnected()) {
      await initializeWebSocket(token);
    }
    
    // Send the initial message using the REST API
    const initialResponse = await sendMessagePolling(params);
    
    // If there was an immediate error, handle it
    if (initialResponse.status === MessageStatus.ERROR) {
      handlers.onError?.(initialResponse.error || 'Unknown error');
      return;
    }
    
    // Get message ID from the response
    const messageId = initialResponse.id;
    
    // Register handler for status updates
    const unregisterHandler = registerMessageHandler(messageId, (update: MessageUpdateEvent) => {
      // Convert status string to enum
      const status = update.status as unknown as MessageStatus;
      
      // Handle status updates
      if (update.status === 'QUEUED' || update.status === 'PROCESSING') {
        handlers.onStatusUpdate?.(
          update.status === 'QUEUED' ? MessageStatus.QUEUED : MessageStatus.PROCESSING,
          update.queue_position
        );
      }
      // Handle completion
      else if (update.status === 'COMPLETE' && update.assistant_content) {
        // Create complete response object
        const completeResponse: ChatResponse = {
          id: update.assistant_message_id || initialResponse.id,
          conversation_id: update.conversation_id,
          content: update.assistant_content,
          created_at: new Date().toISOString(),
          role: 'assistant',
          status: MessageStatus.COMPLETE
        };
        
        // Simulate streaming if requested
        if (handlers.onToken && update.assistant_content.length > 0) {
          // Break the content into chunks to simulate token streaming
          const chunks = update.assistant_content.split(' ');
          (async () => {
            for (const chunk of chunks) {
              handlers.onToken?.(chunk + ' ');
              // Small delay to simulate streaming
              await new Promise(r => setTimeout(r, 15));
            }
            
            // Call complete handler after streaming finishes
            handlers.onComplete?.(completeResponse);
            
            // Clean up handler
            unregisterHandler();
          })();
        } else {
          // Call complete handler immediately
          handlers.onComplete?.(completeResponse);
          
          // Clean up handler
          unregisterHandler();
        }
      }
      // Handle errors
      else if (update.status === 'ERROR') {
        handlers.onError?.(update.error || 'Unknown error');
        
        // Clean up handler
        unregisterHandler();
      }
    });
    
    // Return immediately, updates will come through WebSocket
  } catch (error) {
    console.error('Streaming error:', error);
    handlers.onError?.(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Main message sending function that chooses the appropriate implementation
 * @param params Request parameters including message and optional conversation ID and file
 * @returns Promise with the chat response
 */
export async function sendMessage(params: ChatRequestParams): Promise<ChatResponse> {
  // TEMPORARY FIX: Disable WebSockets to prevent freezing
  console.log('TEMPORARY FIX: Disabling WebSockets to prevent freezing');
  return sendMessagePolling(params);
  
  /* 
  // Default to streaming mode with fallback to polling
  const mode = params.mode || ChatMode.STREAMING;
  */
  
  if (mode === ChatMode.STREAMING) {
    // Use WebSocket-based implementation if possible
    try {
      console.log('Attempting to use streaming message mode');
      
      // Get authentication token
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found, falling back to polling');
        // Fall back to polling if no auth token
        return sendMessagePolling(params);
      }
      
      // Instead of waiting indefinitely for WebSocket to connect,
      // use the ensureWebSocketConnection helper which has a timeout
      const wsAvailable = await ensureWebSocketConnection(token);
      
      if (!wsAvailable) {
        console.log('WebSocket not available, falling back to polling');
        return sendMessagePolling(params);
      }
      
      console.log('WebSocket available, using streaming implementation');
      
      // Wrap the streaming implementation in a Promise with timeout
      return new Promise((resolve, reject) => {
        // Add timeout to avoid hanging
        const timeoutId = setTimeout(() => {
          console.error('Streaming message timed out, falling back to polling');
          // Fall back to polling if streaming times out
          sendMessagePolling(params)
            .then(resolve)
            .catch(reject);
        }, 15000); // 15 second timeout
        
        sendMessageStreaming(params, {
          onComplete: (response) => {
            clearTimeout(timeoutId);
            resolve(response);
          },
          onError: (error) => {
            clearTimeout(timeoutId);
            // Try polling as fallback for errors
            console.warn('Streaming error, falling back to polling:', error);
            sendMessagePolling(params)
              .then(resolve)
              .catch(reject);
          }
        });
      });
    } catch (error) {
      console.warn('WebSocket error, falling back to polling:', error);
      return sendMessagePolling(params);
    }
  } else {
    // Use polling implementation
    console.log('Using polling message mode');
    return sendMessagePolling(params);
  }
}