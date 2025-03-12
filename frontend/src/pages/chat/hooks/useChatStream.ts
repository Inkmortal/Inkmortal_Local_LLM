/**
 * React hook for handling chat streaming with proper state management
 * 
 * Uses the streaming manager architecture for efficient updates without closure issues
 */
import { useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Import chatReducer and state types
import { chatReducer, initialChatState, ChatState, ChatActionType } from '../reducers/chatReducer';
import { 
  Message, 
  MessageRole, 
  MessageStatus,
  ContentUpdateMode
} from '../types/message';

// Import streaming manager
import { 
  streamingManager, 
  useStreamingMessages, 
  MessageUpdate 
} from './streamingManager';

// Import services
import { sendChatMessage } from '../../../services/chat/messageService';
import {
  ensureWebSocketConnection,
  isWebSocketConnected
} from '../../../services/chat/websocketService';

// Import utils
import { showError } from '../../../utils/notifications';

// Hook options
export interface UseChatStreamOptions {
  initialConversationId?: string | null;
  autoConnect?: boolean;
}

// Hook return type
export interface UseChatStreamReturn {
  // State
  state: ChatState;
  
  // Message management
  sendMessage: (content: string, file?: File | null) => Promise<void>;
  stopGeneration: () => void;
  
  // Streaming state
  isGenerating: boolean;
  
  // Messages
  messages: Message[];
}

/**
 * React hook for chat functionality with proper streaming
 * Uses event-based architecture to avoid closure issues
 */
export function useChatStream({
  initialConversationId = null,
  autoConnect = true
}: UseChatStreamOptions = {}): UseChatStreamReturn {
  // Set up reducer for chat state
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialChatState,
    activeConversationId: initialConversationId
  });
  
  // Set up streaming messages
  const { registerMessage, subscribeToMessages } = useStreamingMessages();
  
  // Track component mount status
  const isMounted = useRef(true);
  const tokenRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isGeneratingRef = useRef<boolean>(false);
  
  // Setup effect: get token and set up message handling
  useEffect(() => {
    // Get token from localStorage
    tokenRef.current = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    // Connect WebSocket if needed
    if (autoConnect && tokenRef.current) {
      ensureWebSocketConnection(tokenRef.current);
    }
    
    // Subscribe to streaming messages
    const unsubscribe = subscribeToMessages(handleMessageUpdate);
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      unsubscribe();
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoConnect, subscribeToMessages]);
  
  // Handle message updates from WebSocket
  const handleMessageUpdate = useCallback((update: MessageUpdate) => {
    // Skip updates for messages that we don't know about
    if (!update.messageId) return;
    
    const { 
      messageId, 
      content, 
      contentUpdateMode = ContentUpdateMode.APPEND,
      status, 
      isComplete 
    } = update;
    
    // Update message in state
    dispatch({
      type: ChatActionType.UPDATE_MESSAGE,
      payload: {
        messageId,
        content,
        contentUpdateMode,
        status,
        isComplete,
        metadata: {
          conversationId: update.conversationId,
        }
      }
    });
    
    // Update generating state
    if (isComplete) {
      isGeneratingRef.current = false;
      dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    }
  }, []);
  
  // Send a chat message
  const sendMessage = useCallback(async (content: string, file: File | null = null) => {
    // Prevent sending empty messages
    if (!content.trim() && !file) {
      console.warn('Attempted to send empty message');
      return;
    }
    
    // Check for existing generation in progress
    if (isGeneratingRef.current) {
      showError('A message is already being generated. Please wait or stop generation.');
      return;
    }
    
    // Create temp IDs for immediate UI feedback
    const messageId = uuidv4();
    const assistantMessageId = uuidv4();
    const now = Date.now();
    
    // Create user message
    const userMessage: Message = {
      id: messageId,
      conversationId: state.activeConversationId || 'temp-id',
      role: MessageRole.USER,
      content,
      status: MessageStatus.SENDING,
      timestamp: now
    };
    
    // Create placeholder for assistant response
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversationId: state.activeConversationId || 'temp-id',
      role: MessageRole.ASSISTANT,
      content: '',
      status: MessageStatus.STREAMING,
      timestamp: now,
      sections: {
        response: { content: '', visible: true },
        thinking: { content: '', visible: true }
      }
    };
    
    // Add messages to state for immediate feedback
    dispatch({ type: ChatActionType.ADD_MESSAGE, payload: userMessage });
    dispatch({ type: ChatActionType.ADD_MESSAGE, payload: assistantMessage });
    
    // Set generating state
    isGeneratingRef.current = true;
    dispatch({ type: ChatActionType.SET_GENERATING, payload: true });
    
    // Log the message we're sending
    console.log(`Sending message with assistant ID: ${assistantMessageId}`);
    
    try {
      // Use current conversation ID or create a new one on backend
      const conversationId = state.activeConversationId || undefined;
      
      // Ensure WebSocket is connected if we have a token
      let useWebSocket = isWebSocketConnected();
      if (!useWebSocket && tokenRef.current) {
        useWebSocket = await ensureWebSocketConnection(tokenRef.current);
      }
      
      // Register our message ID before sending the request
      if (useWebSocket && conversationId) {
        // Pre-register for message ID mapping
        registerMessage(assistantMessageId, assistantMessageId, conversationId);
      }
      
      // Send message to server
      const response = await sendChatMessage(
        content,
        conversationId || '',
        file,
        {
          onError: (error) => {
            // Handle errors
            console.error('Error sending message:', error);
            
            // Update message status
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: assistantMessageId,
                status: MessageStatus.ERROR,
                metadata: { error }
              }
            });
            
            // Reset generating state
            isGeneratingRef.current = false;
            dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
          }
        },
        assistantMessageId
      );
      
      // Update conversation ID if this was a new conversation
      if (response.conversation_id && !state.activeConversationId) {
        dispatch({
          type: ChatActionType.SET_ACTIVE_CONVERSATION,
          payload: response.conversation_id
        });
        
        // Update message conversation IDs
        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId,
            metadata: { conversationId: response.conversation_id }
          }
        });
        
        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId: assistantMessageId,
            metadata: { conversationId: response.conversation_id }
          }
        });
      }
      
      // If we got a different ID back from the server, register the mapping
      if (response.message_id && response.message_id !== assistantMessageId) {
        registerMessage(
          assistantMessageId,
          response.message_id,
          response.conversation_id || state.activeConversationId || ''
        );
      }
      
      // Update user message to show it's been sent
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId,
          status: MessageStatus.COMPLETE
        }
      });
      
      // With WebSocket streaming we're done at this point
      // Updates will happen via WebSocket events
      console.log(`Message sent with assistant ID: ${assistantMessageId}`);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      
      // Update assistant message to show error
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: assistantMessageId,
          status: MessageStatus.ERROR,
          metadata: { 
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      });
      
      // Reset generating state
      isGeneratingRef.current = false;
      dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    }
  }, [state.activeConversationId, registerMessage]);
  
  // Stop message generation
  const stopGeneration = useCallback(() => {
    if (!isGeneratingRef.current) return;
    
    // TODO: Implement stop generation (requires backend support)
    console.log('Stopping generation is not yet implemented');
    
    // Reset generating state
    isGeneratingRef.current = false;
    dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    
    // Find the most recent assistant message
    const messages = Object.values(state.messages);
    const assistantMessages = messages
      .filter(msg => msg.role === MessageRole.ASSISTANT)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    // Mark it as complete
    if (assistantMessages.length > 0) {
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: assistantMessages[0].id,
          status: MessageStatus.COMPLETE,
          isComplete: true
        }
      });
    }
  }, [state.messages]);
  
  // Compute derived data for components
  const messages = useMemo(() => {
    // Extract an array of messages sorted by timestamp
    return Object.values(state.messages)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [state.messages]);
  
  // Return public interface
  return {
    state,
    sendMessage,
    stopGeneration,
    isGenerating: isGeneratingRef.current,
    messages
  };
}