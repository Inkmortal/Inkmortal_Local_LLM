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
  
  // Handle message updates from WebSocket - MOVED BEFORE useEffect
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
    } else if (status === MessageStatus.STREAMING && !state.isGenerating) {
      // Ensure state and ref are synchronized
      isGeneratingRef.current = true;
      dispatch({ type: ChatActionType.SET_GENERATING, payload: true });
    }
  }, [state.isGenerating]);
  
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
      
      // If this was the last component using the connection,
      // we could potentially clean up all WebSocket resources here
      // But this would depend on the requirements of the application
      // For now, we'll leave the singleton instances running
    };
  }, [autoConnect, subscribeToMessages, handleMessageUpdate]);
  
  // Send a chat message
  const sendMessage = useCallback(async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) {
      return; // Don't send empty messages without files
    }
    
    try {
      // Ensure we have an active conversation ID
      const conversationId = state.activeConversationId || null;
      
      // Generate message IDs
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();
      
      // Create user message
      const userMessage: Message = {
        id: userMessageId,
        conversationId: conversationId || '',
        role: MessageRole.USER,
        content,
        timestamp: Date.now(),
        status: MessageStatus.SENDING
      };
      
      // Create placeholder assistant message
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId: conversationId || '',
        role: MessageRole.ASSISTANT,
        content: '',
        timestamp: Date.now(),
        status: MessageStatus.PENDING,
        sections: {
          response: { content: '', visible: true },
          thinking: { content: '', visible: false }
        }
      };
      
      // Add messages to state
      dispatch({ 
        type: ChatActionType.ADD_MESSAGE, 
        payload: userMessage 
      });
      
      dispatch({ 
        type: ChatActionType.ADD_MESSAGE, 
        payload: assistantMessage 
      });
      
      // Set generating state
      isGeneratingRef.current = true;
      dispatch({ type: ChatActionType.SET_GENERATING, payload: true });
      
      // Ensure WebSocket connection is active
      const token = tokenRef.current;
      let isConnected = false;
      
      if (token) {
        isConnected = isWebSocketConnected() || await ensureWebSocketConnection(token);
      }
      
      console.log('WebSocket connected:', isConnected);
      
      // Register assistant message ID for tracking
      registerMessage(assistantMessageId, assistantMessageId, conversationId || '');
      
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Send message
      const response = await sendChatMessage({
        message: content,
        conversation_id: conversationId,
        file: file || undefined,
        assistant_message_id: assistantMessageId,
        transport_mode: 'websocket',
        headers: {
          'X-Client-Type': 'react-web-client'
        },
        mode: 'streaming'
      }, abortControllerRef.current.signal);
      
      // Handle immediate response (usually just IDs)
      if (response && response.conversation_id) {
        // If we didn't have a conversation ID, update it now
        if (!conversationId) {
          dispatch({
            type: ChatActionType.SET_ACTIVE_CONVERSATION,
            payload: response.conversation_id
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Reset generating state
      isGeneratingRef.current = false;
      dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
      
      // Show error notification
      showError(error instanceof Error ? error.message : 'Error sending message');
    }
  }, [state.activeConversationId, registerMessage]);
  
  // Stop ongoing generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset generating state
    isGeneratingRef.current = false;
    dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    
    // Update the last message to show it's been stopped
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && lastMessage.role === MessageRole.ASSISTANT) {
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: lastMessage.id,
          status: MessageStatus.COMPLETE,
          isComplete: true,
          metadata: {
            stopped: true
          }
        }
      });
    }
  }, [state.messages]);
  
  // Compute filtered messages based on active conversation
  const messages = useMemo(() => {
    if (!state.activeConversationId) return [];
    
    // Convert from normalized state object to array, then filter
    return Object.values(state.messages).filter(
      message => message.conversationId === state.activeConversationId
    );
  }, [state.messages, state.activeConversationId]);
  
  // Return interface
  return {
    state,
    sendMessage,
    stopGeneration,
    isGenerating: state.isGenerating, // Use state value instead of ref
    messages
  };
}