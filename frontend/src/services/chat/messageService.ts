/**
 * Enhanced message service for chat communication
 * Supports WebSocket streaming, fallback to polling, and robust error handling
 */
import { fetchApi } from '../../config/api';
import { 
  ChatRequestParams, 
  MessageStatus, 
  ChatResponse, 
  MessageStreamHandlers 
} from './types';
import { executeServiceCall, handleApiResponse } from './errorHandling';
import { isWebSocketConnected } from './websocketService';

/**
 * Sends a chat message with streaming support and fallback mechanisms
 * @param message The message content
 * @param conversationId The conversation ID
 * @param file Optional file data
 * @param handlers Streaming event handlers
 * @returns Promise with the response message
 */
export async function sendChatMessage(
  message: string,
  conversationId: string,
  file: any = null,
  handlers: MessageStreamHandlers = {}
): Promise<ChatResponse> {
  // Extract handlers with defaults
  const { 
    onStart = () => {}, 
    onToken = () => {}, 
    onComplete = () => {}, 
    onError = () => {},
    onStatusUpdate = () => {}
  } = handlers;
  
  // Check if WebSocket is connected - this determines our strategy
  const useWebSocket = isWebSocketConnected();
  
  try {
    // Notify that we're starting
    onStart();
    
    // Prepare request data
    const requestData: ChatRequestParams = {
      message,
      conversation_id: conversationId,
      mode: useWebSocket ? 'streaming' : 'polling'
    };
    
    // Add file if provided
    if (file) {
      requestData.file = file;
    }
    
    // Update initial status - we'll be in the queue first
    onStatusUpdate(MessageStatus.QUEUED);
    
    // If using WebSocket, we send the message and then wait for WebSocket updates
    if (useWebSocket) {
      try {
        // Send message request
        const response = await fetchApi<ChatResponse>('/api/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
        
        // Process response
        const result = handleApiResponse(response, {
          title: 'Message Error',
          notifyOnError: false, // Don't show error notification here, we'll handle it
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to send message');
        }
        
        // Return the initial response (WebSocket will handle the rest)
        return result.data;
      } catch (error) {
        console.error('Error sending message via WebSocket:', error);
        throw error;
      }
    } else {
      // Fallback to polling if WebSocket not available
      console.log('WebSocket not connected, falling back to polling');
      
      try {
        const response = await fetchApi<ChatResponse>('/api/chat/message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
        
        // Process response
        const result = handleApiResponse(response, {
          title: 'Message Error',
          notifyOnError: false,
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to send message');
        }
        
        // With polling, we need to manually set status and start polling for updates
        onStatusUpdate(MessageStatus.PROCESSING);
        
        // Start polling for updates
        const messageId = result.data.id;
        const completeMessage = await pollForMessageUpdates(
          messageId, 
          conversationId, 
          { onToken, onStatusUpdate, onError }
        );
        
        // When polling completes, trigger completion handler
        onComplete(completeMessage);
        
        return completeMessage;
      } catch (error) {
        console.error('Error sending message via polling:', error);
        onError(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    }
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    onError(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Polls for message updates when WebSocket is not available
 * @param messageId The message ID to poll for
 * @param conversationId The conversation ID
 * @param handlers Event handlers for streaming updates
 * @returns Promise with the complete message
 */
async function pollForMessageUpdates(
  messageId: string,
  conversationId: string,
  handlers: {
    onToken: (token: string) => void,
    onStatusUpdate: (status: MessageStatus, position?: number) => void,
    onError: (error: string) => void
  }
): Promise<ChatResponse> {
  const { onToken, onStatusUpdate, onError } = handlers;
  
  // Maximum polling attempts (10 minutes at 1 second intervals)
  const MAX_POLLING_ATTEMPTS = 600;
  const POLLING_INTERVAL_MS = 1000;
  
  // To track content across polling updates
  let currentContent = '';
  let lastContent = '';
  let attempts = 0;
  let isDone = false;
  
  // Continue polling until done or max attempts reached
  while (!isDone && attempts < MAX_POLLING_ATTEMPTS) {
    attempts++;
    
    try {
      // Wait for polling interval
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
      
      // Get message update
      // Try both APIs that might exist in backend
      let response;
      try {
        // First try the specific message endpoint
        response = await fetchApi<ChatResponse>(`/api/chat/message/${conversationId}/${messageId}`, {
          method: 'GET',
        });
      } catch (error) {
        // Fallback to conversation endpoint if message-specific endpoint doesn't exist
        response = await fetchApi<{messages: ChatResponse[]}>(`/api/chat/conversation/${conversationId}`, {
          method: 'GET',
        });
        
        // Extract the specific message we're interested in
        if (response && response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            const targetMessage = data.messages.find(msg => msg.id === messageId);
            if (targetMessage) {
              // Create a new response with just the message we want
              response = new Response(JSON.stringify(targetMessage), {
                status: 200,
                headers: response.headers
              });
            }
          }
        }
      }
      
      // Process response without notifications
      const result = handleApiResponse(response, {
        title: 'Message Error',
        notifyOnError: false,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get message update');
      }
      
      const update = result.data;
      
      // Check for completion
      if (update.status === 'complete') {
        isDone = true;
        onStatusUpdate(MessageStatus.COMPLETE);
        return update;
      }
      
      // Check for error
      if (update.status === 'error') {
        isDone = true;
        onStatusUpdate(MessageStatus.ERROR);
        onError(update.error || 'Error generating response');
        return update;
      }
      
      // Update status
      if (update.status === 'processing') {
        onStatusUpdate(MessageStatus.PROCESSING, update.queue_position);
      } else if (update.status === 'streaming') {
        onStatusUpdate(MessageStatus.STREAMING);
      }
      
      // Calculate token update by comparing with previous content
      if (update.content && update.content !== lastContent) {
        const newContent = update.content;
        const tokenUpdate = newContent.substring(currentContent.length);
        
        if (tokenUpdate) {
          onToken(tokenUpdate);
          currentContent = newContent;
          lastContent = newContent;
        }
      }
    } catch (error) {
      console.error('Error polling for message update:', error);
      // Don't give up on a single error, just continue polling
    }
  }
  
  // If we reach max attempts, consider it an error
  if (!isDone) {
    onStatusUpdate(MessageStatus.ERROR);
    onError('Timed out waiting for message completion');
    throw new Error('Timed out waiting for message completion');
  }
  
  // This shouldn't be reached, but satisfy the TypeScript return type
  return {
    id: messageId,
    conversation_id: conversationId,
    content: currentContent,
    created_at: new Date().toISOString(),
    role: 'assistant',
    status: 'complete'
  };
}

/**
 * Regenerates a specific message
 * @param messageId The message ID to regenerate
 * @param conversationId The conversation ID
 * @param handlers Streaming event handlers
 * @returns Promise with the regenerated message
 */
export async function regenerateMessage(
  messageId: string,
  conversationId: string,
  handlers: MessageStreamHandlers = {}
): Promise<ChatResponse> {
  return executeServiceCall(
    async () => {
      const response = await fetchApi<ChatResponse>(`/api/chat/message/${conversationId}/${messageId}/regenerate`, {
        method: 'POST',
      });
      
      const result = handleApiResponse(response, {
        title: 'Regeneration Failed',
        notifyOnError: false,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to regenerate message');
      }
      
      return result.data;
    },
    {} as ChatResponse,
    handlers.onError
  );
}