/**
 * Index file for chat services
 * Centralizes exports from all chat service modules
 */

import { fetchApi } from '../../config/api';

// Public endpoint to get model information
export const fetchModelInfo = async () => {
  try {
    const response = await fetchApi('/api/system/model-info');
    if (!response.success) {
      throw new Error(`Failed to fetch model info: ${response.error || response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching model info:', error);
    return {
      status: 'offline',
      model: 'Unknown',
      online: false
    };
  }
};

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
  sendChatMessage as sendMessage,
  processMessage as sendMessageStreaming
} from './messageService';

// Re-export WebSocket service
export {
  initializeWebSocket,
  closeWebSocket,
  registerMessageHandler,
  isWebSocketConnected,
  ensureWebSocketConnection,
  addConnectionListener
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
import { sendChatMessage, processMessage } from './messageService';
import { createConversation, getConversation, listConversations, deleteConversation, updateConversationTitle } from './conversationService';
import { initializeWebSocket, closeWebSocket, isWebSocketConnected } from './websocketService';
import { ChatMode } from './types';

/**
 * Simplified chat service that provides all chat functionality in one place
 */
export const chatService = {
  // Message operations
  sendMessage: sendChatMessage,
  sendMessageStreaming: processMessage,
  
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