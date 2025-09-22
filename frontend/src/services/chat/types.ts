/**
 * Type definitions for chat services
 */

/**
 * Message status enum for tracking the state of each message
 * 
 * IMPORTANT: These values MUST match the lowercase strings used by the backend
 * Example: Backend sends "error", so we must use ERROR = 'error'
 */
export enum MessageStatus {
  PENDING = 'pending',    // Message is yet to be sent
  SENDING = 'sending',    // Message is being sent to the server
  PREPARING = 'preparing', // Preparing conversation and WebSocket connection
  QUEUED = 'queued',      // Message is in the server queue
  PROCESSING = 'processing', // Message is being processed by the LLM
  STREAMING = 'streaming', // Message is streaming back from the LLM
  COMPLETE = 'complete',  // Message has been processed successfully
  ERROR = 'error'         // An error occurred during processing
}

/**
 * Content update mode for streaming messages
 */
export enum ContentUpdateMode {
  APPEND = 'append',      // Append content to existing message
  REPLACE = 'replace'     // Replace existing content
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
 * Client readiness signal
 */
export interface ClientReadyMessage extends WebSocketMessage {
  type: 'client_ready';
  message_id: string;
  conversation_id: string;
  timestamp: number;
}

/**
 * Readiness confirmation from server
 */
export interface ReadinessConfirmation extends WebSocketMessage {
  type: 'readiness_confirmed';
  message_id: string;
  conversation_id: string;
  readiness_confirmed: boolean;
}

/**
 * Message update from WebSocket (raw format)
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
  content_update_mode?: string;  // 'APPEND' or 'REPLACE'
  is_final_message?: boolean;    // Indicates if this is the final message in a stream
  sequence?: number;             // Sequence number for ordering
  metadata?: MessageMetadata;    // Metadata about the message/generation
}

/**
 * Session data for conversation continuity between phases
 */
export interface ConversationSessionData {
  conversationId: string;      // Confirmed conversation ID from backend
  sessionToken: string;        // Auth token for this specific conversation
  assistantMessageId: string;  // Frontend message ID for tracking
}

/**
 * Message section types
 */
export type MessageSection = 'thinking' | 'response';

/**
 * Message metadata structure
 */
export interface MessageMetadata {
  model?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  sequence?: number;
  [key: string]: any;  // Allow additional fields
}

/**
 * Processed message update (after going through messageHandler)
 */
export interface MessageUpdate {
  messageId: string;
  conversationId: string;
  content: string;
  status: MessageStatus;
  section?: MessageSection;
  sections?: {
    response: MessageSection;
    thinking?: MessageSection;
  };
  contentUpdateMode?: ContentUpdateMode;
  isComplete?: boolean;
  error?: string;
  sequence?: number;  // Message sequence number for ordering
  metadata?: MessageMetadata;  // Proper metadata field
}