/**
 * Index file for chat services
 * Centralizes exports from all chat service modules
 */

// Re-export types
export { MessageStatus, ChatMode } from './types';
export type { 
  ChatRequestParams, 
  ChatResponse, 
  ConversationSummary, 
  ConversationData,
  MessageStreamHandlers
} from './types';

// Re-export message services
export { 
  sendMessage,
  sendMessagePolling,
  sendMessageStreaming
} from './messageService';

// Re-export WebSocket service
export {
  initializeWebSocket,
  closeWebSocket,
  registerMessageHandler,
  isWebSocketConnected
} from './websocketService';

// Re-export conversation services
export { 
  createConversation, 
  getConversation, 
  listConversations, 
  deleteConversation, 
  updateConversationTitle 
} from './conversationService';

// Re-export error utilities
export {
  createErrorResponse,
  getErrorMessageFromStatus,
  handleApiResponse,
  executeServiceCall,
  fetchWithRetry,
  RETRY_STATUS_CODES
} from './errorHandling';

// Import for the singleton chat service
import { sendMessage, sendMessageStreaming } from './messageService';
import { createConversation, getConversation, listConversations, deleteConversation, updateConversationTitle } from './conversationService';
import { initializeWebSocket, closeWebSocket, isWebSocketConnected } from './websocketService';
import { ChatMode } from './types';

/**
 * Simplified chat service that provides all chat functionality in one place
 */
export const chatService = {
  // Message operations
  sendMessage,
  sendMessageStreaming,
  
  // Conversation operations
  createConversation,
  getConversation,
  listConversations,
  deleteConversation,
  updateConversationTitle,
  
  // WebSocket operations
  initializeWebSocket,
  closeWebSocket,
  isWebSocketConnected,
  
  // Config
  setMode(mode: ChatMode): void {
    this.mode = mode;
  },
  
  // Default to streaming mode
  mode: ChatMode.STREAMING
};