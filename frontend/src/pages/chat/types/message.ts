// Enhanced message types for the chat system
import { 
  MessageStatus, 
  ContentUpdateMode,
  MessageUpdate as WebSocketMessageUpdate,
  MessageSection as WebSocketMessageSection
} from '../../../services/chat/types';

// Re-export these for backwards compatibility
export { MessageStatus, ContentUpdateMode };
export type MessageSection = WebSocketMessageSection;

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface MessageSectionContent {
  content: string;
  visible: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  timestamp: number;
  content: string;
  
  // Optional sectioned content
  sections?: {
    response: MessageSectionContent;
    thinking?: MessageSectionContent;
  };
  
  status: MessageStatus;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

// Update payload type for modifying existing messages - aligned with MessageUpdate from services/chat/types.ts
export interface MessageUpdatePayload extends Partial<WebSocketMessageUpdate> {
  messageId: string;
  content?: string;
  contentUpdateMode?: ContentUpdateMode;
  status?: MessageStatus;
  section?: MessageSection;
  isComplete?: boolean;
  metadata?: Record<string, any>;
}