/**
 * Index file for chat services
 * Centralizes exports from all chat service modules
 */

// Re-export types
export { MessageStatus } from './types';
export type { 
  ChatRequestParams, 
  ChatResponse, 
  ConversationSummary, 
  ConversationData 
} from './types';

// Re-export message services
export { sendMessage } from './messageService';

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
  createErrorResponseFromApiResponse,
  getErrorMessageFromStatus
} from './errorHandling';