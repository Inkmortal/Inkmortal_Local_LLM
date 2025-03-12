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
  STREAMING = 'streaming', // Message is streaming back from the LLM
  COMPLETE = 'complete',  // Message has been processed successfully
  ERROR = 'error'         // An error occurred during processing
}

/**
 * Communication mode for chat interactions
 */
export enum ChatMode {
  POLLING = 'polling',    // Traditional request-response pattern
  STREAMING = 'streaming' // Real-time streaming response (WebSockets)
}

/**
 * Parameters for chat message requests
 */
export interface ChatRequestParams {
  message: string;             // The message content
  conversation_id?: string;    // Optional conversation ID
  file?: File | any;          // Optional file attachment (or processed file data)
  timeout?: number;            // Optional timeout in milliseconds
  mode?: ChatMode | string;   // Communication mode (polling or streaming)
  assistant_message_id?: string; // Frontend-generated assistant message ID
  headers?: Record<string, string>; // Additional headers to help backend identify client type
  transport_mode?: 'websocket' | 'sse'; // Explicitly control how responses are delivered
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
  queue_position?: number;     // Position in queue (if available)
  success?: boolean;           // Whether the operation was successful
  message_id?: string;         // Optional message ID returned from backend
  assistant_message_id?: string; // Optional frontend-generated assistant message ID for tracking
}

/**
 * Represents a conversation summary
 * Matches API response from /api/chat/conversations
 */
export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/**
 * Represents the complete conversation data with messages
 * Matches API response from /api/chat/conversation/{id}
 */
export interface ConversationData {
  id: string;
  title: string;
  messages: ChatResponse[];
  created_at: string;
  updated_at: string;
}

/**
 * Message streaming event handlers
 */
export interface MessageStreamHandlers {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (message: ChatResponse) => void;
  onError?: (error: string) => void;
  onStatusUpdate?: (status: MessageStatus, position?: number) => void;
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * Message update from WebSocket
 */
export interface MessageUpdateEvent extends WebSocketMessage {
  type: 'message_update';
  message_id: string;
  conversation_id: string;
  status: string;
  queue_position?: number;
  assistant_message_id?: string;
  assistant_content?: string;
  error?: string;
}