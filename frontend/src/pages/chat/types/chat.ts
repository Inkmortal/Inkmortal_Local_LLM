// Type definitions for chat functionality

// Message interface for UI
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// Conversation history item
export interface Conversation {
  id: string;
  title: string;
  date: Date;
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
}