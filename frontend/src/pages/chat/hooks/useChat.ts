/**
 * Main chat functionality hook
 * 
 * This hook combines all chat-related functionality from separate modules:
 * - Connection management
 * - Conversation management
 * - Message management
 * - Utility functions
 */
import { useReducer, useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  closeWebSocket, 
  isWebSocketConnected,
  ensureWebSocketConnection,
  subscribeToMessageUpdates
} from '../../../services/chat/websocketService';
import { chatReducer, initialChatState, ChatActionType } from '../reducers/chatReducer';
import { Message, Conversation, MessageRole, MessageStatus, ContentUpdateMode } from '../types/message';
import { useChatConnection } from './useChatConnection';
import { useChatConversations } from './useChatConversations';
import { useChatMessages } from './useChatMessages';
import { useRegisterMessageId } from '../../../services/chat/StreamingContext';
import { MessageUpdate } from '../../../services/chat/types';

/**
 * Options for the useChat hook
 */
export interface UseChatOptions {
  initialConversationId?: string | null;
  autoConnect?: boolean;
}

/**
 * Return type for the useChat hook
 */
export interface UseChatReturn {
  // State
  state: any;
  
  // Conversation management
  loadConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  startNewConversation: () => void;
  deleteCurrentConversation: () => Promise<void>;
  updateConversationTitle: (title: string) => Promise<void>;
  
  // Message management
  sendMessage: (content: string, file?: File | null) => Promise<void>;
  regenerateMessage: () => Promise<void>;
  regenerateLastMessage?: () => Promise<void>;
  stopGeneration: () => void;
  
  // WebSocket connection
  connectWebSocket: () => Promise<boolean>;
  
  // Derived data for components
  messages: Message[];
  sortedMessages?: Message[];
  conversationList?: Conversation[];
  activeConversation?: Conversation | null;
  isGenerating?: boolean;
  
  // File handling
  handleFileSelect?: (file: File) => void;
  clearSelectedFile?: () => void;
  selectedFile?: File | null;
  
  // Editor refs
  codeInsertRef?: React.RefObject<((code: string) => void) | undefined>;
  mathInsertRef?: React.RefObject<((formula: string) => void) | undefined>;
}

/**
 * Main chat functionality hook
 * 
 * @param options Hook options
 * @returns Chat functionality
 */
export const useChat = ({ 
  initialConversationId = null,
  autoConnect = true
}: UseChatOptions = {}): UseChatReturn => {
  // Setup core reducer and state
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialChatState,
    activeConversationId: initialConversationId
  });
  
  // Important refs
  const isMounted = useRef(true);
  const tokenRef = useRef<string | null>(null);
  const codeInsertRef = useRef<((code: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((formula: string) => void) | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Register message ID with streaming context
  const registerMessage = useRegisterMessageId();
  
  // Handle message updates from WebSocket directly - more reliable for streaming
  const handleStreamingUpdate = useCallback((update: MessageUpdate) => {
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
    
    // Update generating state if needed
    if (isComplete) {
      dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    } else if (status === MessageStatus.STREAMING && !state.isGenerating) {
      dispatch({ type: ChatActionType.SET_GENERATING, payload: true });
    }
  }, [state.isGenerating]);
  
  // Setup direct WebSocket streaming handling
  useEffect(() => {
    // Get token from localStorage
    tokenRef.current = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    // Connect WebSocket if needed
    if (autoConnect && tokenRef.current) {
      ensureWebSocketConnection(tokenRef.current);
    }
    
    // Subscribe to message updates directly for streaming
    const unsubscribe = subscribeToMessageUpdates(handleStreamingUpdate);
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      unsubscribe();
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoConnect, handleStreamingUpdate]);
  
  // Message and connection handling are interdependent, so we need to initialize
  // them in a specific order to avoid circular dependencies
  
  // First, create message handlers without WebSocket specifics
  const messageHandlers = useChatMessages(state, dispatch, isMounted, tokenRef);

  // Then create connection management using message handlers
  const { connectWebSocket } = useChatConnection(
    tokenRef,
    dispatch,
    state,
    messageHandlers.handleWebSocketMessage
  );
  
  // Conversation management is independent
  const { 
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteCurrentConversation,
    updateConversationTitle
  } = useChatConversations(state, dispatch, isMounted);
  
  // Use improved sendMessage function directly instead of from messageHandlers
  // This ensures we get correct streaming behavior 
  const sendMessage = useCallback(async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) {
      return; // Don't send empty messages without files
    }
    
    try {
      // Generate temporary conversation ID if needed
      const tempConversationId = state.activeConversationId || uuidv4();
      
      // Determine the conversation ID to use
      const conversationId = state.activeConversationId || tempConversationId;
      
      // Generate message IDs
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();
      
      // If we're creating a new conversation, set it as active immediately
      if (!state.activeConversationId) {
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
      dispatch({ type: ChatActionType.SET_GENERATING, payload: true });
      
      // Ensure WebSocket connection is active
      const token = tokenRef.current;
      let isConnected = false;
      
      if (token) {
        isConnected = isWebSocketConnected() || await ensureWebSocketConnection(token);
      }
      
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Register message ID with streaming context - only register once
      // This maps frontend and backend message IDs for the streaming context
      registerMessage(assistantMessageId, assistantMessageId, conversationId);
      
      // Also update user message to complete status
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: userMessageId,
          status: MessageStatus.COMPLETE
        }
      });
      
      // Use existing sendChatMessage function from messageHandlers
      const response = await messageHandlers.sendChatMessage(
        content,
        backendConversationId,
        file,
        assistantMessageId
      );
      
      // Handle backend response with real IDs
      if (response && response.conversation_id) {
        // If the backend returned a different conversation ID than our temp one
        if (!state.activeConversationId || 
            (state.activeConversationId === tempConversationId && 
             response.conversation_id !== tempConversationId)) {
              
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
      dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    }
  }, [state.activeConversationId, registerMessage, messageHandlers.sendChatMessage]);
  
  // Use other message handlers
  const { regenerateMessage } = messageHandlers;
  
  // Improved stop generation function
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset generating state
    dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    
    // Update the last message to show it's been stopped
    const lastMessage = Object.values(state.messages)
      .filter(m => m.role === MessageRole.ASSISTANT)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
      
    if (lastMessage) {
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
  
  // File handling state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const handleFileSelect = (file: File) => setSelectedFile(file);
  const clearSelectedFile = () => setSelectedFile(null);
  
  // Setup effect: get token and connect
  useEffect(() => {
    // Get token from either token or authToken storage
    tokenRef.current = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    // Connect WebSocket if auto-connect is enabled
    if (autoConnect && tokenRef.current) {
      console.log('Auto-connecting WebSocket in useChat');
      connectWebSocket();
    }
    
    return () => {
      isMounted.current = false;
      
      // Clean up WebSocket connection - but only if we're unmounting the entire chat
      // Don't close connection when just switching between conversations
      if (!window.location.pathname.includes('/chat')) {
        console.log('Leaving chat area, closing WebSocket connection');
        closeWebSocket();
      } else {
        console.log('Staying in chat area, keeping WebSocket connection alive');
      }
    };
  }, [autoConnect, connectWebSocket]);
  
  // Load initial conversation if ID is provided
  useEffect(() => {
    // Only attempt to load if we have a conversation ID
    if (initialConversationId) {
      console.log(`[useChat] Initial conversation ID provided: ${initialConversationId}`);
      
      // Use the ID from the URL directly rather than waiting for state update
      loadConversation(initialConversationId);
    } else {
      console.log('[useChat] No initial conversation ID provided');
    }
  }, [initialConversationId, loadConversation]);
  
  // Derive messages array from state
  const messages = useMemo(() => {
    return Object.values(state.messages).sort((a, b) => a.timestamp - b.timestamp);
  }, [state.messages]);
  
  // Get current active conversation details
  const activeConversation = useMemo(() => {
    return state.activeConversationId ? state.conversations[state.activeConversationId] : null;
  }, [state.activeConversationId, state.conversations]);
  
  // Convert conversations dictionary to array
  const conversationList = useMemo(() => {
    return Object.values(state.conversations).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state.conversations]);
  
  // Alias for regenerateMessage to match expected interface
  const regenerateLastMessage = () => {
    regenerateMessage();
  };
  
  // Is message generation in progress?
  const isGenerating = useMemo(() => {
    return Object.values(state.messages).some(msg => 
      msg.status === MessageStatus.STREAMING || 
      msg.status === MessageStatus.PROCESSING || 
      msg.status === MessageStatus.QUEUED
    );
  }, [state.messages]);
  
  return {
    state,
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteCurrentConversation,
    updateConversationTitle,
    sendMessage,
    regenerateMessage,
    regenerateLastMessage,
    stopGeneration,
    connectWebSocket,
    
    // Add derived data for components
    messages,
    sortedMessages: messages, // Alias to match expected interface
    conversationList,
    activeConversation,
    isGenerating,
    
    // File handling implementation
    handleFileSelect,
    clearSelectedFile,
    selectedFile,
    
    // Editor refs for code and math
    codeInsertRef,
    mathInsertRef
  };
};