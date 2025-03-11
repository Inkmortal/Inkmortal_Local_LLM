import {
  Message,
  Conversation,
  MessageStatus,
  ContentUpdateMode,
  MessageUpdatePayload
} from '../types/message';

export interface ChatState {
  messages: Record<string, Message>;
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  error: Error | null;
  isWebSocketConnected: boolean;
}

export enum ChatActionType {
  SET_CONVERSATIONS = 'SET_CONVERSATIONS',
  ADD_CONVERSATION = 'ADD_CONVERSATION',
  SET_ACTIVE_CONVERSATION = 'SET_ACTIVE_CONVERSATION',
  SET_MESSAGES = 'SET_MESSAGES',
  ADD_MESSAGE = 'ADD_MESSAGE',
  UPDATE_MESSAGE = 'UPDATE_MESSAGE',
  REMOVE_MESSAGE = 'REMOVE_MESSAGE',
  SET_LOADING_MESSAGES = 'SET_LOADING_MESSAGES',
  SET_LOADING_CONVERSATIONS = 'SET_LOADING_CONVERSATIONS',
  SET_ERROR = 'SET_ERROR',
  CLEAR_ERROR = 'CLEAR_ERROR',
  SET_WEBSOCKET_CONNECTED = 'SET_WEBSOCKET_CONNECTED'
}

export type ChatAction =
  | { type: ChatActionType.SET_CONVERSATIONS; payload: Conversation[] }
  | { type: ChatActionType.ADD_CONVERSATION; payload: Conversation }
  | { type: ChatActionType.SET_ACTIVE_CONVERSATION; payload: string | null }
  | { type: ChatActionType.SET_MESSAGES; payload: Message[] }
  | { type: ChatActionType.ADD_MESSAGE; payload: Message }
  | { type: ChatActionType.UPDATE_MESSAGE; payload: MessageUpdatePayload }
  | { type: ChatActionType.REMOVE_MESSAGE; payload: string }
  | { type: ChatActionType.SET_LOADING_MESSAGES; payload: boolean }
  | { type: ChatActionType.SET_LOADING_CONVERSATIONS; payload: boolean }
  | { type: ChatActionType.SET_ERROR; payload: Error }
  | { type: ChatActionType.CLEAR_ERROR }
  | { type: ChatActionType.SET_WEBSOCKET_CONNECTED; payload: boolean };

export const initialChatState: ChatState = {
  messages: {},
  conversations: {},
  activeConversationId: null,
  isLoadingMessages: false,
  isLoadingConversations: false,
  error: null,
  isWebSocketConnected: false
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case ChatActionType.SET_CONVERSATIONS:
      return {
        ...state,
        conversations: action.payload.reduce((acc, conv) => {
          acc[conv.id] = conv;
          return acc;
        }, {} as Record<string, Conversation>)
      };
      
    case ChatActionType.ADD_CONVERSATION:
      return {
        ...state,
        conversations: {
          ...state.conversations,
          [action.payload.id]: action.payload
        }
      };
      
    case ChatActionType.SET_ACTIVE_CONVERSATION:
      return {
        ...state,
        activeConversationId: action.payload
      };
      
    case ChatActionType.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload.reduce((acc, msg) => {
          acc[msg.id] = msg;
          return acc;
        }, {} as Record<string, Message>)
      };
      
    case ChatActionType.ADD_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.id]: action.payload
        }
      };
      
    case ChatActionType.UPDATE_MESSAGE: {
      const { messageId, content, contentUpdateMode, status, section, metadata, isComplete } = action.payload;
      const message = state.messages[messageId];
      
      if (!message) return state;
      
      const updatedMessage = { ...message };
      
      // Update status if provided
      if (status !== undefined) {
        updatedMessage.status = status;
      }
      
      // Update content if provided
      if (content !== undefined) {
        // Use the specified update mode or default to append
        const mode = contentUpdateMode || ContentUpdateMode.APPEND;
        
        // If we're updating a specific section
        if (section && updatedMessage.sections) {
          const sectionData = updatedMessage.sections[section as keyof typeof updatedMessage.sections];
          
          if (sectionData) {
            // Create a new sections object to avoid mutation
            updatedMessage.sections = {
              ...updatedMessage.sections,
              [section]: {
                ...sectionData,
                content: mode === ContentUpdateMode.APPEND
                  ? sectionData.content + content
                  : content
              }
            };
          } else if (section === 'thinking' && !updatedMessage.sections.thinking) {
            // Create thinking section if it doesn't exist
            updatedMessage.sections = {
              ...updatedMessage.sections,
              thinking: {
                content: content,
                visible: true
              }
            };
          } else if (section === 'response' && !updatedMessage.sections.response) {
            // Create response section if it doesn't exist
            updatedMessage.sections = {
              ...updatedMessage.sections,
              response: {
                content: content,
                visible: true
              }
            };
          }
        } else if (section && !updatedMessage.sections) {
          // Create sections object if it doesn't exist
          updatedMessage.sections = {
            response: {
              content: section === 'response' ? content : '',
              visible: true
            }
          };
          
          // Add thinking section if that's what we're updating
          if (section === 'thinking') {
            updatedMessage.sections.thinking = {
              content: content,
              visible: true
            };
          }
        } else {
          // Update main content
          updatedMessage.content = mode === ContentUpdateMode.APPEND
            ? message.content + content
            : content;
        }
      }
      
      // Update metadata if provided
      if (metadata) {
        updatedMessage.metadata = {
          ...message.metadata,
          ...metadata
        };
      }
      
      // Update completion status
      if (isComplete !== undefined) {
        if (!updatedMessage.metadata) {
          updatedMessage.metadata = {};
        }
        updatedMessage.metadata.isComplete = isComplete;
        
        // If message is complete, also update status
        if (isComplete && updatedMessage.status === MessageStatus.STREAMING) {
          updatedMessage.status = MessageStatus.COMPLETE;
        }
      }
      
      return {
        ...state,
        messages: {
          ...state.messages,
          [messageId]: updatedMessage
        }
      };
    }
      
    case ChatActionType.REMOVE_MESSAGE: {
      const newMessages = { ...state.messages };
      delete newMessages[action.payload];
      
      return {
        ...state,
        messages: newMessages
      };
    }
      
    case ChatActionType.SET_LOADING_MESSAGES:
      return {
        ...state,
        isLoadingMessages: action.payload
      };
      
    case ChatActionType.SET_LOADING_CONVERSATIONS:
      return {
        ...state,
        isLoadingConversations: action.payload
      };
      
    case ChatActionType.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
      
    case ChatActionType.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
    
    case ChatActionType.SET_WEBSOCKET_CONNECTED:
      return {
        ...state,
        isWebSocketConnected: action.payload
      };
      
    default:
      return state;
  }
}