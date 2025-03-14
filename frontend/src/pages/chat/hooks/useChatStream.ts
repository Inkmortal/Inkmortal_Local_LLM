/**
 * React hook for handling chat streaming with proper state management
 * 
 * Uses React context for reliable streaming updates
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

// Import streaming context and types
import { useRegisterMessageId } from '../../../services/chat/StreamingContext';
import { MessageUpdate } from '../../../services/chat/types';

// Import services
import { sendChatMessage } from '../../../services/chat/messageService';
import {
  ensureWebSocketConnection,
  isWebSocketConnected,
  subscribeToMessageUpdates
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
  
  // Use register message ID from streaming context
  const registerMessage = useRegisterMessageId();
  
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
    
    // Subscribe to message updates directly
    const unsubscribe = subscribeToMessageUpdates(handleMessageUpdate);
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      unsubscribe();
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoConnect, subscribeToMessageUpdates, handleMessageUpdate]);
  
  // Send a chat message with optimistic UI updates
  const sendMessage = useCallback(async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) {
      return; // Don't send empty messages without files
    }
    
    try {
      // Generate temporary conversation ID if needed
      const tempConversationId = uuidv4();
      
      // Determine the conversation ID to use:
      // 1. Use existing conversation ID if available
      // 2. Otherwise, use the new temporary ID
      const conversationId = state.activeConversationId || tempConversationId;
      
      // Generate message IDs
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();
      
      // If we're creating a new conversation, set it as active immediately
      if (!state.activeConversationId) {
        console.log(`[useChatStream] Creating new conversation with temp ID: ${tempConversationId}`);
        dispatch({
          type: ChatActionType.SET_ACTIVE_CONVERSATION,
          payload: tempConversationId
        });
        
        // Also add a temporary conversation object
        dispatch({
          type: ChatActionType.ADD_CONVERSATION,
          payload: {
            id: tempConversationId,
            title: "New conversation",
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        });
      }
      
      // Modify conversation ID for new conversations
      const backendConversationId = state.activeConversationId ? conversationId : "new";
      console.log(`[useChatStream] Using conversationId for backend: ${backendConversationId}, (active=${state.activeConversationId}, temp=${tempConversationId})`);
      
      // Create user message with the determined conversationId
      const userMessage: Message = {
        id: userMessageId,
        conversationId: conversationId,
        role: MessageRole.USER,
        content,
        timestamp: Date.now(),
        status: MessageStatus.SENDING
      };
      
      // Create placeholder assistant message with the same conversationId
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId: conversationId,
        role: MessageRole.ASSISTANT,
        content: '',
        timestamp: Date.now(),
        status: MessageStatus.PENDING,
        sections: {
          response: { content: '', visible: true },
          thinking: { content: '', visible: false }
        }
      };
      
      // Add messages to state immediately for optimistic UI update
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
      
      console.log('[useChatStream] WebSocket connected:', isConnected);
      
      // Register assistant message ID for tracking through context system
      registerMessage(assistantMessageId, assistantMessageId, conversationId);
      
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Send message to backend
      console.log(`[useChatStream] Sending message to backend with conversationId: ${conversationId}`);
      console.log(`[useChatStream] Using assistantMessageId: ${assistantMessageId}`);
      
      // Register message ID with streaming context
      registerMessage(assistantMessageId, assistantMessageId, conversationId);
      
      // CRITICAL: Verify the assistantMessageId is defined before sending
      if (!assistantMessageId) {
        console.error(`[useChatStream] CRITICAL ERROR: assistantMessageId is undefined!`);
      }
      
      const response = await sendChatMessage(
        content,                  // message parameter
        backendConversationId,    // conversationId parameter (using "new" for new conversations)
        file || null,             // file parameter
        {                         // handlers parameter
          onStatusUpdate: (status) => {
            console.log(`[useChatStream] Message status update: ${status}`);
          }
        },
        assistantMessageId        // assistantMessageId parameter - ensure this is passed properly
      );
      
      // Handle backend response with real IDs
      if (response && response.conversation_id) {
        console.log(`[useChatStream] Received conversation_id from backend: ${response.conversation_id}`);
        
        // If the backend returned a different conversation ID than our temp one
        if (!state.activeConversationId || 
            (state.activeConversationId === tempConversationId && 
             response.conversation_id !== tempConversationId)) {
              
          console.log(`[useChatStream] Syncing with backend conversation ID: ${response.conversation_id}`);
          
          // Update our state with the real conversation ID
          dispatch({
            type: ChatActionType.SYNC_CONVERSATION_ID,
            payload: {
              oldId: conversationId,
              newId: response.conversation_id
            }
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