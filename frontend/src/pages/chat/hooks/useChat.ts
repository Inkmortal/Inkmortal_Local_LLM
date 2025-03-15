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
  subscribeToMessageUpdates
} from '../../../services/chat/websocketService';
import { chatReducer, initialChatState, ChatActionType } from '../reducers/chatReducer';
import { Message, Conversation, MessageRole, MessageStatus, ContentUpdateMode } from '../types/message';
import { useChatConnection } from './useChatConnection';
import { useChatConversations } from './useChatConversations';
import { useRegisterMessageId } from '../../../services/chat/StreamingContext';
import { MessageUpdate } from '../../../services/chat/types';
import { sendChatMessage } from '../../../services/chat/messageService';

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
  
  // Store isGenerating state in a ref to avoid dependency issues
  const isGeneratingRef = useRef(false);
  
  // Update the ref when state changes
  useEffect(() => {
    isGeneratingRef.current = state.isGenerating;
  }, [state.isGenerating]);
  
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
    
    // Update generating state if needed - using the ref to avoid re-creating this callback
    if (isComplete) {
      dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    } else if (status === MessageStatus.STREAMING && !isGeneratingRef.current) {
      dispatch({ type: ChatActionType.SET_GENERATING, payload: true });
    }
  }, []);
  
  // Setup direct WebSocket streaming handling
  useEffect(() => {
    // Get token from localStorage
    tokenRef.current = localStorage.getItem('token') || localStorage.getItem('authToken');
    
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
  }, [handleStreamingUpdate]);
  
  // Message and connection handling are interdependent, so we need to initialize
  // them in a specific order to avoid circular dependencies
  
  // Create connection management only for connecting to WebSocket
  // We don't need the message handlers from useChatMessages since we use StreamingContext
  const { connectWebSocket } = useChatConnection(
    tokenRef,
    dispatch,
    state
  );
  
  // Conversation management is independent
  const { 
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteCurrentConversation,
    updateConversationTitle
  } = useChatConversations(state, dispatch, isMounted);
  
  // Simplified sendMessage function that doesn't create temporary conversation IDs
  // This ensures a clean flow where conversations are only created server-side
  const sendMessage = useCallback(async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) {
      return; // Don't send empty messages without files
    }
    
    try {
      // Generate message IDs
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();
      
      // Create user message
      const userMessage: Message = {
        id: userMessageId,
        conversationId: state.activeConversationId || 'new',
        role: MessageRole.USER,
        content,
        timestamp: Date.now(),
        status: MessageStatus.SENDING
      };
      
      // Create placeholder assistant message
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId: state.activeConversationId || 'new',
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
      
      // Use the connection manager from useChatConnection
      const token = tokenRef.current;
      let isConnected = false;
      
      if (token) {
        isConnected = await connectWebSocket();
      }
      
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      
      // Register message ID with streaming context
      // If no conversation exists yet, we'll use 'new' as a placeholder
      registerMessage(assistantMessageId, assistantMessageId, state.activeConversationId || 'new');
      
      // Update user message to complete status
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: userMessageId,
          status: MessageStatus.COMPLETE
        }
      });
      
      // Send the message to the backend
      // If no conversation exists, the backend will create one
      const response = await sendChatMessage(
        content,
        state.activeConversationId || null, // null means create new conversation
        file,
        {}, // empty handlers
        assistantMessageId
      );
      
      // If this is a new conversation, update our state with the real conversation ID
      if (response && response.conversation_id && !state.activeConversationId) {
        const newConversationId = response.conversation_id;
        
        // Update active conversation ID
        dispatch({
          type: ChatActionType.SET_ACTIVE_CONVERSATION,
          payload: newConversationId
        });
        
        // Update message conversation IDs
        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId: userMessageId,
            metadata: { conversationId: newConversationId }
          }
        });
        
        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId: assistantMessageId,
            metadata: { conversationId: newConversationId }
          }
        });
        
        // Use proper programmatic navigation to update URL
        // This replaces window.history.pushState to ensure proper routing
        if (typeof window !== 'undefined') {
          console.log(`[useChat] New conversation created, updating URL to: /chat/${newConversationId}`);
          window.history.replaceState({}, '', `/chat/${newConversationId}`);
          
          // Dispatch a custom event to notify the router of the URL change
          window.dispatchEvent(new CustomEvent('chat:conversation-created', {
            detail: { conversationId: newConversationId }
          }));
        }
        
        // Refresh the conversation list to include the new conversation
        loadConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Reset generating state
      dispatch({ type: ChatActionType.SET_GENERATING, payload: false });
    }
  }, [state.activeConversationId, registerMessage, loadConversations]);
  
  // Implement regenerate message functionality directly
  const regenerateMessage = useCallback(async () => {
    // Find the last user message
    const userMessages = Object.values(state.messages)
      .filter((msg: Message) => msg.role === MessageRole.USER)
      .sort((a: Message, b: Message) => b.timestamp - a.timestamp);
    
    if (userMessages.length === 0) {
      return;
    }
    
    // Get the most recent user message
    const lastUserMessage = userMessages[0];
    
    // Send it again to regenerate the response
    await sendMessage(lastUserMessage.content);
  }, [state.messages, sendMessage]);
  
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