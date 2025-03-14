import {
  Message,
  Conversation,
  MessageRole,
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
  isGenerating: boolean;
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
  SET_WEBSOCKET_CONNECTED = 'SET_WEBSOCKET_CONNECTED',
  SET_GENERATING = 'SET_GENERATING',
  SYNC_CONVERSATION_ID = 'SYNC_CONVERSATION_ID' // New action for syncing temporary IDs with backend
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
  | { type: ChatActionType.SET_WEBSOCKET_CONNECTED; payload: boolean }
  | { type: ChatActionType.SET_GENERATING; payload: boolean }
  | { type: ChatActionType.SYNC_CONVERSATION_ID; payload: { oldId: string, newId: string } };

export const initialChatState: ChatState = {
  messages: {},
  conversations: {},
  activeConversationId: null,
  isLoadingMessages: false,
  isLoadingConversations: false,
  error: null,
  isWebSocketConnected: false,
  isGenerating: false
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
      // Preserve any streaming or in-progress messages when loading conversation history
      const newMessages = action.payload.reduce((acc, msg) => {
        acc[msg.id] = msg;
        return acc;
      }, {} as Record<string, Message>);
      
      // Find any streaming/processing messages to preserve
      const messagesToPreserve = Object.values(state.messages).filter(msg => 
        msg.status === MessageStatus.STREAMING || 
        msg.status === MessageStatus.PROCESSING ||
        msg.status === MessageStatus.QUEUED
      );
      
      // Keep those messages in the new state
      messagesToPreserve.forEach(msg => {
        newMessages[msg.id] = msg;
      });
      
      return {
        ...state,
        messages: newMessages
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
      let message = state.messages[messageId];
      
      // If message doesn't exist yet, create a placeholder
      if (!message) {
        console.log(`Creating placeholder for missing message ${messageId} in reducer`);
        
        // CRITICAL FIX: Create a fully-featured placeholder message with all required properties
        // This ensures consistent structure for the message, regardless of how it's created
        message = {
          id: messageId,
          conversationId: metadata?.conversationId || 'temp-id',
          role: MessageRole.ASSISTANT,
          content: '',
          status: status || MessageStatus.STREAMING,
          timestamp: Date.now(),
          // Always include sections with proper structure
          sections: {
            response: { 
              content: '', 
              visible: true 
            },
            thinking: { 
              content: '', 
              visible: true 
            }
          },
          // Initialize metadata to prevent undefined access
          metadata: {
            ...metadata,
            isComplete: false
          }
        };
        
        // Log this critical placeholder creation
        console.log(`[chatReducer] Created placeholder message ${messageId} with conversationId ${metadata?.conversationId || 'temp-id'}`);
        console.log(`[chatReducer] Placeholder status: ${status || MessageStatus.STREAMING}`);
        
        // Log important message creation events with conversation ID for tracing
        console.log(`CRITICAL: Created new placeholder message ${messageId} for conversation ${metadata?.conversationId || 'unknown'}`);
      }
      
      const updatedMessage = { ...message };
      
      // Update status if provided
      if (status !== undefined) {
        updatedMessage.status = status;
      }
      
      // Update content if provided
      if (content !== undefined) {
        // Use the specified update mode or default to append
        const mode = contentUpdateMode || ContentUpdateMode.APPEND;
        
        // Update the main content field for all messages
        updatedMessage.content = mode === ContentUpdateMode.APPEND
          ? (updatedMessage.content || '') + content
          : content;
        
        // ARCHITECTURAL IMPROVEMENT: If this is an assistant message, ensure content
        // is also mirrored to the response section that will be displayed
        if (updatedMessage.role === MessageRole.ASSISTANT) {
          // Ensure sections exist
          if (!updatedMessage.sections) {
            updatedMessage.sections = {
              response: { content: '', visible: true },
              thinking: { content: '', visible: false }
            };
          }
          
          // If we're updating a specific section (like "thinking")
          if (section && updatedMessage.sections) {
            const sectionData = updatedMessage.sections[section as keyof typeof updatedMessage.sections];
            
            if (sectionData) {
              // Create a new sections object to avoid mutation
              updatedMessage.sections = {
                ...updatedMessage.sections,
                [section]: {
                  ...sectionData,
                  content: mode === ContentUpdateMode.APPEND
                    ? (sectionData.content || '') + content
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
          } else {
            // No specific section provided, mirror content to response section
            // This ensures content is always available where ChatMessage expects it
            if (updatedMessage.sections.response) {
              updatedMessage.sections.response.content = mode === ContentUpdateMode.APPEND
                ? (updatedMessage.sections.response.content || '') + content
                : content;
            }
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
      
      // Always return a consistent state structure regardless of whether 
      // this was a new or existing message
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
    
    case ChatActionType.SET_GENERATING:
      return {
        ...state,
        isGenerating: action.payload
      };
    
    case ChatActionType.SYNC_CONVERSATION_ID: {
      const { oldId, newId } = action.payload;
      
      console.log(`[chatReducer] Syncing conversation ID: ${oldId} → ${newId}`);
      
      // If IDs are the same, no need to sync
      if (oldId === newId) {
        console.log(`[chatReducer] IDs are the same, no syncing needed`);
        return state;
      }
      
      // Update conversation object if it exists
      const updatedConversations = { ...state.conversations };
      if (updatedConversations[oldId]) {
        // Create conversation with new ID
        updatedConversations[newId] = {
          ...updatedConversations[oldId],
          id: newId
        };
        
        // Remove old ID entry
        delete updatedConversations[oldId];
        console.log(`[chatReducer] Updated conversation object: ${oldId} → ${newId}`);
      }
      
      // Update all message objects that reference the old conversation ID
      const updatedMessages = { ...state.messages };
      let messageUpdateCount = 0;
      
      Object.keys(updatedMessages).forEach(messageId => {
        const message = updatedMessages[messageId];
        if (message.conversationId === oldId) {
          updatedMessages[messageId] = {
            ...message,
            conversationId: newId
          };
          messageUpdateCount++;
        }
      });
      
      console.log(`[chatReducer] Updated ${messageUpdateCount} messages with new conversation ID`);
      
      // Update active conversation ID if needed
      const updatedActiveId = state.activeConversationId === oldId ? newId : state.activeConversationId;
      
      return {
        ...state,
        messages: updatedMessages,
        conversations: updatedConversations,
        activeConversationId: updatedActiveId
      };
    }
      
    default:
      return state;
  }
}