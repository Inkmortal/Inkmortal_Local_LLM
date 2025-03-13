// Type definitions for chat functionality
import { MessageStatus, ContentUpdateMode } from './message';

// Re-export types that other modules need
export { MessageStatus, ContentUpdateMode };

// Message interface for UI
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  error?: string;
  queue_position?: number;
}

// Conversation history item
export interface Conversation {
  id: string;
  title: string;
  date: Date;
  lastMessage?: string;
}

// Artifact types
export type ArtifactType = 'code' | 'math' | 'image';

export interface Artifact {
  content: string;
  type: ArtifactType;
}

// Chat request parameters for API
export interface ChatRequestParams {
  message: string;
  conversation_id?: string;
  file?: File;
  timeout?: number;
}