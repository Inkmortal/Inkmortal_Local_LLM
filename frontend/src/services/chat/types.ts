/**
 * Type definitions for chat services
 */

/**
 * Message status enum for tracking the state of each message
 */
export enum MessageStatus {
  SENDING = 'sending',    // Message is being sent to the server
  QUEUED = 'queued',      // Message is in the server queue
  PROCESSING = 'processing', // Message is being processed by the LLM
  COMPLETE = 'complete',  // Message has been processed successfully
  ERROR = 'error'         // An error occurred during processing
}

/**
 * Parameters for chat message requests
 */
export interface ChatRequestParams {
  message: string;             // The message content
  conversation_id?: string;    // Optional conversation ID
  file?: File;                 // Optional file attachment (image or PDF)
  timeout?: number;            // Optional timeout in milliseconds
}

/**
 * Represents a message response from the API
 */
export interface ChatResponse {
  id: string;                  // Message ID
  conversation_id: string;     // Conversation ID
  content: string;             // Message content
  created_at: string;          // Timestamp when message was created
  role: string;                // 'user', 'assistant', or 'system'
  status?: MessageStatus;      // Processing status (frontend only)
  error?: string;              // Error message if status is ERROR (frontend only)
}

/**
 * Represents a conversation summary
 */
export interface ConversationSummary {
  conversation_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Represents the complete conversation data with messages
 */
export interface ConversationData {
  conversation_id: string;
  title?: string;
  messages: ChatResponse[];
  created_at: string;
  updated_at: string;
}