// Enhanced message types for the chat system
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum MessageStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  STREAMING = 'streaming',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export enum ContentUpdateMode {
  APPEND = 'append',
  REPLACE = 'replace'
}

export interface MessageSection {
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
    response: MessageSection;
    thinking?: MessageSection;
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

// Update payload type for modifying existing messages
export interface MessageUpdatePayload {
  messageId: string;
  content?: string;
  contentUpdateMode?: ContentUpdateMode;
  status?: MessageStatus;
  section?: string;
  isComplete?: boolean;
  metadata?: Record<string, any>;
}