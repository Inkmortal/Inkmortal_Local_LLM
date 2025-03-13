/**
 * Main chat functionality hook
 * 
 * This hook combines all chat-related functionality from separate modules:
 * - Connection management
 * - Conversation management
 * - Message management
 * - Utility functions
 */
import { useReducer, useEffect, useRef, useMemo, useState } from 'react';
import { closeWebSocket } from '../../../services/chat/websocketService';
import { chatReducer, initialChatState, ChatActionType } from '../reducers/chatReducer';
import { Message, Conversation, MessageRole } from '../types/message';
import { useChatConnection } from './useChatConnection';
import { useChatConversations } from './useChatConversations';
import { useChatMessages } from './useChatMessages';

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
  
  // Destructure message functionality from handlers
  const { 
    sendMessage,
    regenerateMessage,
    stopGeneration,
  } = messageHandlers;
  
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