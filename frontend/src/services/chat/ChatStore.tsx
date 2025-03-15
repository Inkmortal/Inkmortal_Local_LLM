import React, { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageRole } from '../../pages/chat/types/message';
import { ConversationSummary, ConversationData, MessageStatus, ContentUpdateMode } from './types';
import { sendChatMessage } from './messageService';
import { subscribeToMessageUpdates } from './websocketService';
import { useRegisterMessageId } from './StreamingContext';
import { getConversation, listConversations } from './conversationService';

// Action types
export enum ChatActionType {
  SET_CONVERSATIONS = 'SET_CONVERSATIONS',
  SET_ACTIVE_CONVERSATION = 'SET_ACTIVE_CONVERSATION',
  SET_LOADING = 'SET_LOADING',
  SET_LOADING_CONVERSATIONS = 'SET_LOADING_CONVERSATIONS',
  ADD_MESSAGE = 'ADD_MESSAGE',
  UPDATE_MESSAGE = 'UPDATE_MESSAGE',
  SET_ERROR = 'SET_ERROR',
  CLEAR_MESSAGES = 'CLEAR_MESSAGES',
}

// State interface
export interface ChatState {
  conversations: Record<string, ConversationSummary>;
  activeConversationId: string | null;
  messages: Record<string, Message>;
  isLoading: boolean;
  isLoadingConversations: boolean;
  error: Error | null;
}

// Initial state
const initialState: ChatState = {
  conversations: {},
  activeConversationId: null,
  messages: {},
  isLoading: false,
  isLoadingConversations: false,
  error: null,
};

// Action types
type Action =
  | { type: ChatActionType.SET_CONVERSATIONS; payload: ConversationSummary[] }
  | { type: ChatActionType.SET_ACTIVE_CONVERSATION; payload: string | null }
  | { type: ChatActionType.SET_LOADING; payload: boolean }
  | { type: ChatActionType.SET_LOADING_CONVERSATIONS; payload: boolean }
  | { type: ChatActionType.ADD_MESSAGE; payload: any } // Using any to accommodate different message formats
  | { type: ChatActionType.UPDATE_MESSAGE; payload: { messageId: string; content?: string; status?: MessageStatus; isComplete?: boolean; contentUpdateMode?: ContentUpdateMode; conversationId?: string } }
  | { type: ChatActionType.SET_ERROR; payload: Error }
  | { type: ChatActionType.CLEAR_MESSAGES };

// Reducer
function chatReducer(state: ChatState, action: Action): ChatState {
  switch (action.type) {
    case ChatActionType.SET_CONVERSATIONS:
      return {
        ...state,
        conversations: action.payload.reduce((acc, conv) => {
          acc[conv.id] = conv;
          return acc;
        }, {} as Record<string, Conversation>),
      };

    case ChatActionType.SET_ACTIVE_CONVERSATION:
      console.log(`[ChatStore] Setting active conversation ID: ${action.payload}`);
      return {
        ...state,
        activeConversationId: action.payload,
      };

    case ChatActionType.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ChatActionType.SET_LOADING_CONVERSATIONS:
      return {
        ...state,
        isLoadingConversations: action.payload,
      };

    case ChatActionType.ADD_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.id]: action.payload,
        },
      };

    case ChatActionType.UPDATE_MESSAGE: {
      const { messageId, content, status, isComplete, contentUpdateMode, conversationId } = action.payload;
      const message = state.messages[messageId];

      if (!message) {
        console.warn(`Cannot update message ${messageId} - not found in state`);
        return state;
      }

      const updatedMessage = { ...message };

      if (content !== undefined) {
        if (contentUpdateMode === ContentUpdateMode.REPLACE) {
          updatedMessage.content = content;
        } else {
          updatedMessage.content = (updatedMessage.content || '') + content;
        }
      }

      if (status !== undefined) {
        updatedMessage.status = status;
      }

      if (isComplete !== undefined && status === MessageStatus.STREAMING) {
        updatedMessage.status = MessageStatus.COMPLETE;
      }

      if (conversationId !== undefined) {
        updatedMessage.conversationId = conversationId;
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [messageId]: updatedMessage,
        },
      };
    }

    case ChatActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case ChatActionType.CLEAR_MESSAGES:
      return {
        ...state,
        messages: {},
      };

    default:
      return state;
  }
}

// Context
interface ChatContextValue extends ChatState {
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, file?: File | null) => Promise<any>;
  clearActiveConversation: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// Provider props
interface ChatProviderProps {
  children: ReactNode;
}

// Provider component
export function ChatProvider({ children }: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const registerMessageId = useRegisterMessageId();

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      dispatch({ type: ChatActionType.SET_LOADING_CONVERSATIONS, payload: true });
      const conversations = await listConversations();
      dispatch({ type: ChatActionType.SET_CONVERSATIONS, payload: conversations });
    } catch (error) {
      console.error('Error loading conversations:', error);
      dispatch({ type: ChatActionType.SET_ERROR, payload: error as Error });
    } finally {
      dispatch({ type: ChatActionType.SET_LOADING_CONVERSATIONS, payload: false });
    }
  }, []);

  // Load specific conversation
  const loadConversation = useCallback(async (id: string) => {
    if (!id) return;
    
    try {
      dispatch({ type: ChatActionType.SET_LOADING, payload: true });
      dispatch({ type: ChatActionType.CLEAR_MESSAGES });
      dispatch({ type: ChatActionType.SET_ACTIVE_CONVERSATION, payload: id });
      
      const conversation = await getConversation(id);
      
      // Only proceed if we got a conversation back
      if (conversation) {
        // If conversation has messages, add them to state
        if (conversation.messages && conversation.messages.length > 0) {
          conversation.messages.forEach(message => {
            dispatch({ type: ChatActionType.ADD_MESSAGE, payload: message });
          });
        }
      }
    } catch (error) {
      console.error(`Error loading conversation ${id}:`, error);
      dispatch({ type: ChatActionType.SET_ERROR, payload: error as Error });
    } finally {
      dispatch({ type: ChatActionType.SET_LOADING, payload: false });
    }
  }, []);

  // Clear active conversation (used when navigating to /chat with no ID)
  const clearActiveConversation = useCallback(() => {
    dispatch({ type: ChatActionType.CLEAR_MESSAGES });
    dispatch({ type: ChatActionType.SET_ACTIVE_CONVERSATION, payload: null });
  }, []);

  // Send a message with improved conversation ID handling
  const sendMessage = useCallback(async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) return;

    try {
      // Generate message IDs
      const userMessageId = uuidv4();
      const assistantMessageId = uuidv4();
      
      // Determine temporary or existing conversation ID
      const currentConversationId = state.activeConversationId || 'new';

      // Create user message
      const userMessage: Message = {
        id: userMessageId,
        conversationId: currentConversationId,
        role: MessageRole.USER,
        content,
        timestamp: Date.now(),
        status: MessageStatus.COMPLETE
      };

      // Create placeholder assistant message
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId: currentConversationId,
        role: MessageRole.ASSISTANT,
        content: '',
        timestamp: Date.now(),
        status: MessageStatus.PENDING
      };

      // Add messages to state
      dispatch({ type: ChatActionType.ADD_MESSAGE, payload: userMessage });
      dispatch({ type: ChatActionType.ADD_MESSAGE, payload: assistantMessage });

      // IMPORTANT: Always register message ID with temporary ID
      // This ensures the WebSocket connection knows which message to update
      console.log(`[ChatStore] Registering message with temp ID: ${currentConversationId}`);
      registerMessageId(
        assistantMessageId, 
        assistantMessageId, 
        currentConversationId
      );

      // Send message to backend
      const response = await sendChatMessage(
        content,
        state.activeConversationId, // Will be null for new conversations
        file,
        {},
        assistantMessageId
      );

      console.log("[ChatStore] Received response:", response);

      // If new conversation was created, update the conversation ID
      if (response && response.conversation_id && 
         (currentConversationId === 'new' || !state.activeConversationId)) {
        const newConversationId = response.conversation_id;
        console.log(`[ChatStore] New conversation created: ${newConversationId}`);
        
        // Update the active conversation ID
        dispatch({ 
          type: ChatActionType.SET_ACTIVE_CONVERSATION, 
          payload: newConversationId 
        });

        // Update message conversation IDs
        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId: userMessageId,
            conversationId: newConversationId
          }
        });

        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId: assistantMessageId,
            conversationId: newConversationId
          }
        });

        // Reload conversations to include the new one
        loadConversations();
        
        // Return the full response so the router can update the URL
        return response;
      }
      
      // Return the response for existing conversations too
      return response;
    } catch (error) {
      console.error('[ChatStore] Error sending message:', error);
      dispatch({ type: ChatActionType.SET_ERROR, payload: error as Error });
      // Return null to indicate error
      return null;
    }
  }, [state.activeConversationId, registerMessageId, loadConversations]);

  // Setup message update listener
  useEffect(() => {
    const unsubscribe = subscribeToMessageUpdates((update) => {
      if (!update.messageId) return;

      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: update.messageId,
          content: update.content,
          status: update.status,
          isComplete: update.isComplete,
          contentUpdateMode: update.contentUpdateMode
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value: ChatContextValue = {
    ...state,
    loadConversations,
    loadConversation,
    sendMessage,
    clearActiveConversation
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// Custom hook to use the chat context
export function useChatStore() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatStore must be used within a ChatProvider');
  }
  return context;
}