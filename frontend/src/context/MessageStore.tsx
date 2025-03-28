import React, { createContext, useReducer, useContext, ReactNode } from 'react';
import { MessageRole, MessageStatus, ContentUpdateMode } from '../pages/chat/types/message';

// Define types for sections
export interface MessageSection {
  content: string;
  isVisible: boolean;
  isStreaming: boolean;
}

// Define message type
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  status: MessageStatus;
  sections: Record<string, MessageSection>;
}

// State definition
export interface MessageState {
  messages: Record<string, Message>;
  activeMessageId: string | null;
  streamingMessageIds: Set<string>;
}

// Initial state
const initialState: MessageState = {
  messages: {},
  activeMessageId: null,
  streamingMessageIds: new Set(),
};

// Actions
export enum MessageActionType {
  REGISTER_MESSAGE = 'REGISTER_MESSAGE',
  UPDATE_MESSAGE = 'UPDATE_MESSAGE',
  UPDATE_SECTION = 'UPDATE_SECTION',
  SET_STREAMING = 'SET_STREAMING',
  TOGGLE_SECTION = 'TOGGLE_SECTION',
}

// Action types
type MessageAction =
  | {
      type: MessageActionType.REGISTER_MESSAGE;
      payload: {
        messageId: string;
        message: Message;
      };
    }
  | {
      type: MessageActionType.UPDATE_MESSAGE;
      payload: {
        messageId: string;
        content?: string;
        status?: MessageStatus;
        conversationId?: string;
        sections?: Record<string, MessageSection>;
      };
    }
  | {
      type: MessageActionType.UPDATE_SECTION;
      payload: {
        messageId: string;
        section: string;
        content: string;
        mode: ContentUpdateMode;
      };
    }
  | {
      type: MessageActionType.SET_STREAMING;
      payload: {
        messageId: string;
        isStreaming: boolean;
      };
    }
  | {
      type: MessageActionType.TOGGLE_SECTION;
      payload: {
        messageId: string;
        section: string;
        isVisible: boolean;
      };
    };

// Reducer
function messageReducer(state: MessageState, action: MessageAction): MessageState {
  switch (action.type) {
    case MessageActionType.REGISTER_MESSAGE: {
      const { messageId, message } = action.payload;
      return {
        ...state,
        messages: {
          ...state.messages,
          [messageId]: message,
        },
      };
    }

    case MessageActionType.UPDATE_MESSAGE: {
      const { messageId, content, status, conversationId, sections } = action.payload;
      const message = state.messages[messageId];

      if (!message) {
        console.warn(`Cannot update message ${messageId} - not found in state`);
        return state;
      }

      const updatedMessage = { ...message };

      if (content !== undefined) {
        updatedMessage.content = content;
      }

      if (status !== undefined) {
        updatedMessage.status = status;
      }

      if (conversationId !== undefined) {
        updatedMessage.conversationId = conversationId;
      }

      if (sections !== undefined) {
        updatedMessage.sections = sections;
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [messageId]: updatedMessage,
        },
      };
    }

    case MessageActionType.UPDATE_SECTION: {
      const { messageId, section, content, mode } = action.payload;
      const message = state.messages[messageId];

      if (!message) {
        console.warn(`Cannot update section for message ${messageId} - not found in state`);
        return state;
      }

      const currentSection = message.sections[section] || {
        content: '',
        isVisible: section === 'response', // response is visible by default, thinking is not
        isStreaming: true,
      };

      const updatedContent =
        mode === ContentUpdateMode.APPEND
          ? currentSection.content + content
          : content;

      const updatedSections = {
        ...message.sections,
        [section]: {
          ...currentSection,
          content: updatedContent,
          isStreaming: true,
        },
      };

      return {
        ...state,
        messages: {
          ...state.messages,
          [messageId]: {
            ...message,
            sections: updatedSections,
          },
        },
        streamingMessageIds: new Set(state.streamingMessageIds).add(messageId),
      };
    }

    case MessageActionType.SET_STREAMING: {
      const { messageId, isStreaming } = action.payload;
      const newStreamingIds = new Set(state.streamingMessageIds);

      if (isStreaming) {
        newStreamingIds.add(messageId);
      } else {
        newStreamingIds.delete(messageId);
      }

      // Also update the streaming status in the sections
      const message = state.messages[messageId];
      if (message) {
        const updatedSections = { ...message.sections };
        
        // Update isStreaming flag for all sections
        Object.keys(updatedSections).forEach(sectionKey => {
          updatedSections[sectionKey] = {
            ...updatedSections[sectionKey],
            isStreaming,
          };
        });

        return {
          ...state,
          messages: {
            ...state.messages,
            [messageId]: {
              ...message,
              status: isStreaming ? MessageStatus.STREAMING : MessageStatus.COMPLETE,
              sections: updatedSections,
            },
          },
          streamingMessageIds: newStreamingIds,
        };
      }

      return {
        ...state,
        streamingMessageIds: newStreamingIds,
      };
    }

    case MessageActionType.TOGGLE_SECTION: {
      const { messageId, section, isVisible } = action.payload;
      const message = state.messages[messageId];

      if (!message) {
        console.warn(`Cannot toggle section for message ${messageId} - not found in state`);
        return state;
      }

      const currentSection = message.sections[section];
      if (!currentSection) {
        console.warn(`Section ${section} not found in message ${messageId}`);
        return state;
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [messageId]: {
            ...message,
            sections: {
              ...message.sections,
              [section]: {
                ...currentSection,
                isVisible,
              },
            },
          },
        },
      };
    }

    default:
      return state;
  }
}

// Context
interface MessageContextType {
  state: MessageState;
  dispatch: React.Dispatch<MessageAction>;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

// Provider
export const MessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(messageReducer, initialState);

  // Log updates for debugging during development
  const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  if (isDevelopment) {
    console.log('[MessageStore] State updated:', state);
  }

  return (
    <MessageContext.Provider value={{ state, dispatch }}>
      {children}
    </MessageContext.Provider>
  );
};

// Hook for components
export function useMessageStore() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessageStore must be used within a MessageProvider');
  }
  return context;
}

// Selector hooks for optimized component rendering
export function useMessage(messageId: string): Message | undefined {
  const { state } = useMessageStore();
  return state.messages[messageId];
}

export function useMessageSections(messageId: string) {
  const message = useMessage(messageId);
  return message?.sections || {};
}

export function useMessageStreaming(messageId: string): boolean {
  const { state } = useMessageStore();
  return state.streamingMessageIds.has(messageId);
}

export function useMessageSection(messageId: string, section: string): MessageSection | undefined {
  const sections = useMessageSections(messageId);
  return sections[section];
} 