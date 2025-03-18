/**
 * Two-phase chat message service
 * 
 * Implements a robust two-phase message sending process:
 * 1. Prepare: Create conversation and get conversation ID
 * 2. Process: Set up WebSocket listeners and queue message for LLM processing
 */
import { fetchApi } from '../../config/api';
import { 
  ChatRequestParams, 
  MessageStatus, 
  ChatResponse, 
  MessageStreamHandlers,
  ConversationSessionData
} from './types';
import { executeServiceCall, handleApiResponse } from './errorHandling';
import { 
  isWebSocketConnected, 
  waitForWebSocketConnection, 
  registerMessageId,
  signalClientReady,
  waitForReadinessConfirmation
} from './websocketService';

// Constants
const WS_CONNECTION_TIMEOUT_MS = 3000; // Wait up to 3 seconds for WS connection
const MESSAGE_POLL_INTERVAL_MS = 1000; // Poll every second when using polling mode

/**
 * Phase 1: Prepare conversation
 * Creates conversation in backend and returns conversation ID
 * 
 * @param content Initial message content (for title generation)
 * @param assistantMessageId Frontend-generated message ID
 * @returns Promise with conversation session data
 */
export async function prepareConversation(
  content: string,
  assistantMessageId: string
): Promise<ConversationSessionData> {
  console.log('[messageService] Preparing conversation', { assistantMessageId });

  try {
    // Create basic payload for conversation creation
    const preparePayload = {
      message: content.substring(0, 100), // Just enough for title generation
      prepare_only: true, // Signal to backend this is phase 1
      assistant_message_id: assistantMessageId
    };

    // Make API call to prepare conversation
    const response = await fetchApi('/api/chat/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preparePayload)
    });

    // Process response
    const result = handleApiResponse(response, {
      title: 'Conversation Creation Failed',
      notifyOnError: false
    });

    if (!result.success || !result.data) {
      console.error('[messageService] Failed to prepare conversation:', result.error);
      throw new Error(result.error || 'Failed to prepare conversation');
    }

    // Extract conversation data
    const conversationData = result.data;
    
    if (!conversationData.conversation_id) {
      throw new Error('Backend did not return a valid conversation ID');
    }

    console.log('[messageService] Successfully prepared conversation:', {
      conversationId: conversationData.conversation_id,
      sessionToken: conversationData.session_token
    });

    // Return essential data for phase 2
    return {
      conversationId: conversationData.conversation_id,
      sessionToken: conversationData.session_token || 'legacy',
      assistantMessageId: assistantMessageId
    };
  } catch (error) {
    console.error('[messageService] Error preparing conversation:', error);
    throw error;
  }
}

/**
 * Phase 2: Process message
 * Sends message to LLM for processing after conversation is created
 * 
 * @param message Full message content
 * @param sessionData Conversation session data from phase 1
 * @param file Optional file attachment
 * @param handlers Event handlers for streaming updates
 * @returns Promise with the processed message response
 */
export async function processMessage(
  message: string,
  sessionData: ConversationSessionData,
  file: File | null = null,
  handlers: MessageStreamHandlers = {}
): Promise<ChatResponse> {
  console.log('[messageService] Processing message', { 
    conversationId: sessionData.conversationId,
    assistantMessageId: sessionData.assistantMessageId
  });

  // Extract handlers with defaults
  const { 
    onStart = () => {}, 
    onToken = () => {}, 
    onComplete = () => {}, 
    onError = () => {},
    onStatusUpdate = () => {}
  } = handlers;

  try {
    // Phase 2: Establish WebSocket connection first
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    // Ensure WebSocket connection is ready
    onStart();
    onStatusUpdate(MessageStatus.PREPARING);
    
    const useWebSocket = await waitForWebSocketConnection(token, WS_CONNECTION_TIMEOUT_MS);
    
    if (useWebSocket) {
      console.log('[messageService] WebSocket connected and validated');
    } else {
      console.warn('[messageService] WebSocket connection failed, will use polling fallback');
    }
    
    // Register message ID mapping before sending request
    if (sessionData.assistantMessageId && sessionData.conversationId) {
      console.log('[messageService] Registering message ID mapping', {
        assistantMessageId: sessionData.assistantMessageId,
        conversationId: sessionData.conversationId
      });
      
      // Initial ID mapping - both IDs are the same until backend assigns a real ID
      registerMessageId(
        sessionData.assistantMessageId,
        sessionData.assistantMessageId,
        sessionData.conversationId
      );
      
      // NEW: If using WebSocket, send readiness signal to backend
      if (useWebSocket) {
        console.log('[READINESS-DEBUG] Starting client readiness protocol for message flow');
        console.log('[READINESS-DEBUG] Message details: ' + 
                   `msgId=${sessionData.assistantMessageId.substring(0,8)}, ` + 
                   `convId=${sessionData.conversationId.substring(0,8)}`);
        
        const readySignalSent = signalClientReady(
          sessionData.assistantMessageId,
          sessionData.conversationId
        );
        
        if (readySignalSent) {
          console.log('[READINESS-DEBUG] Now waiting for backend readiness confirmation');
          
          // Wait for backend to confirm readiness before proceeding
          const waitStart = Date.now();
          const confirmed = await waitForReadinessConfirmation(sessionData.assistantMessageId, 3000);
          const waitDuration = Date.now() - waitStart;
          
          if (confirmed) {
            console.log(`[READINESS-DEBUG] SUCCESS: Client readiness confirmed by backend after ${waitDuration}ms`);
          } else {
            console.warn(`[READINESS-DEBUG] WARNING: No readiness confirmation from backend after ${waitDuration}ms, proceeding anyway`);
          }
        } else {
          console.warn('[READINESS-DEBUG] ERROR: Failed to send readiness signal, proceeding anyway');
        }
      }
    } else {
      console.error('[messageService] Cannot register message - missing IDs');
    }

    // Now prepare the process request
    onStatusUpdate(MessageStatus.QUEUED);
    
    const processPayload = {
      message: message,
      conversation_id: sessionData.conversationId,
      session_token: sessionData.sessionToken,
      assistant_message_id: sessionData.assistantMessageId,
      transport_mode: useWebSocket ? 'websocket' : 'sse',
      mode: 'streaming',
      headers: useWebSocket ? {
        "Connection": "Upgrade",
        "Upgrade": "websocket",
        "X-Client-Type": "react-web-client"
      } : {}
    };

    if (file) {
      processPayload['file'] = file;
    }

    // Make API call to process the message
    const response = await fetchApi('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(processPayload)
    });

    // Process response based on connection type
    if (useWebSocket) {
      // For WebSocket, we just need confirmation the processing started
      const result = handleApiResponse(response, {
        title: 'Processing Failed',
        notifyOnError: false
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to start message processing');
      }

      // If we have a real message ID from the response, update our mapping
      if (result.data && result.data.message_id && 
          result.data.message_id !== sessionData.assistantMessageId) {
        console.log('[messageService] Updating mapping with real backend ID:', result.data.message_id);
        
        // Update our mapping with the backend-generated ID
        registerMessageId(
          sessionData.assistantMessageId,
          result.data.message_id,
          sessionData.conversationId
        );
        
        // Return both IDs for clarity
        return {
          success: true,
          conversation_id: sessionData.conversationId,
          message_id: result.data.message_id,
          assistant_message_id: sessionData.assistantMessageId
        };
      }
      
      // Return with the known conversation ID
      return {
        success: true,
        conversation_id: sessionData.conversationId,
        message_id: sessionData.assistantMessageId,
        assistant_message_id: sessionData.assistantMessageId
      };
    } else {
      // For polling, we need to get the message ID and start polling
      const result = handleApiResponse(response, {
        title: 'Message Processing Failed',
        notifyOnError: false
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to process message');
      }

      // Start polling process for non-WebSocket connections
      onStatusUpdate(MessageStatus.PROCESSING);
      
      const messageId = result.data?.id || sessionData.assistantMessageId;
      
      const completeMessage = await pollForMessageUpdates(
        messageId,
        sessionData.conversationId,
        { onToken, onStatusUpdate, onError }
      );
      
      onComplete(completeMessage);
      return completeMessage;
    }
  } catch (error) {
    console.error('[messageService] Error processing message:', error);
    onError(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Combined function for both preparing conversation and sending message
 * This provides a simpler interface for the rest of the application
 * 
 * @param message Message content
 * @param existingConversationId Optional existing conversation ID
 * @param file Optional file attachment
 * @param handlers Event handlers for streaming
 * @param assistantMessageId Optional frontend message ID
 * @returns Promise with response data
 */
export async function sendChatMessage(
  message: string, 
  existingConversationId: string | null = null,
  file: File | null = null,
  handlers: MessageStreamHandlers = {},
  assistantMessageId?: string
): Promise<ChatResponse> {
  console.log('[messageService] sendChatMessage called', { 
    existingConversationId, 
    assistantMessageId 
  });

  const messageId = assistantMessageId || `msg_${Date.now()}`;

  try {
    // For existing conversations, skip preparation phase
    if (existingConversationId) {
      console.log('[messageService] Using existing conversation:', existingConversationId);
      
      const sessionData: ConversationSessionData = {
        conversationId: existingConversationId,
        sessionToken: 'existing', // Not needed for existing conversations
        assistantMessageId: messageId
      };
      
      const response = await processMessage(message, sessionData, file, handlers);
      console.log('[messageService] Process message response for existing conversation:', {
        success: response.success,
        conversation_id: response.conversation_id,
        message_id: response.message_id,
      });
      return response;
    }
    
    // For new conversations, do the two-phase process
    console.log('[messageService] Starting two-phase message process');
    
    // Phase 1: Prepare conversation and get ID
    const sessionData = await prepareConversation(message, messageId);
    console.log('[messageService] Conversation prepared:', {
      conversationId: sessionData.conversationId,
      assistantMessageId: sessionData.assistantMessageId
    });
    
    // Phase 2: Process message with confirmed conversation ID
    const response = await processMessage(message, sessionData, file, handlers);
    console.log('[messageService] Process message response for new conversation:', {
      success: response.success,
      conversation_id: response.conversation_id,
      message_id: response.message_id,
    });
    return response;
  } catch (error) {
    console.error('[messageService] Complete message flow failed:', error);
    handlers.onError?.(error instanceof Error ? error.message : 'Unknown error');
    
    return {
      success: false,
      message_id: messageId,
      conversation_id: existingConversationId || null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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
      await new Promise(resolve => setTimeout(resolve, MESSAGE_POLL_INTERVAL_MS));
      
      // Verify we have both required IDs
      if (!conversationId || !messageId) {
        console.error(`Invalid IDs for message polling - conversationId: ${conversationId}, messageId: ${messageId}`);
        throw new Error('Missing required conversation or message ID for polling');
      }
      
      // Try the message-specific endpoint first
      let response;
      try {
        console.log(`Polling for message update: ${conversationId}/${messageId}`);
        response = await fetchApi(`/api/chat/message/${conversationId}/${messageId}`, {
          method: 'GET',
        });
      } catch (error) {
        // Fallback to conversation endpoint
        console.log(`Message-specific endpoint failed, trying conversation endpoint fallback`);
        response = await fetchApi(`/api/chat/conversation/${conversationId}`, {
          method: 'GET',
        });
        
        // Extract the specific message we're interested in
        if (response) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            const targetMessage = data.messages.find(msg => msg.id === messageId);
            if (targetMessage) {
              // Return just the message we want
              return targetMessage;
            } else {
              console.error(`Message ${messageId} not found in conversation data`);
              throw new Error(`Message not found in conversation data`);
            }
          } else {
            console.error(`Invalid conversation response format - missing messages array`);
            throw new Error(`Invalid conversation response format`);
          }
        }
      }
      
      // Process response
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
      const response = await fetchApi(`/api/chat/message/${conversationId}/${messageId}/regenerate`, {
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