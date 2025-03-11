/**
 * Conversation management services for chat functionality
 */
import { fetchApi } from '../../config/api';
import { ConversationData, ConversationSummary, MessageStatus } from './types';
import { 
  executeServiceCall,
  fetchWithRetry,
  handleApiResponse
} from './errorHandling';
import { showSuccess } from '../../utils/notifications';

/**
 * Creates a new conversation
 * @param title Optional title for the conversation
 * @returns Promise with the new conversation ID or null on error
 */
export async function createConversation(title?: string): Promise<{ conversation_id: string } | null> {
  return executeServiceCall(
    async () => {
      const response = await fetchApi<{ conversation_id: string }>('/api/chat/conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });
      
      const result = handleApiResponse(response, {
        title: 'Conversation Error'
      });
      
      return result.success ? result.data : null;
    },
    null
  );
}

/**
 * Retrieves conversation history
 * @param conversationId The ID of the conversation to retrieve
 * @returns Promise with the conversation history or null on error
 */
export async function getConversation(conversationId: string): Promise<ConversationData | null> {
  return executeServiceCall(
    async () => {
      const response = await fetchApi<ConversationData>(`/api/chat/conversation/${conversationId}`, {
        method: 'GET',
      });
      
      // Use centralized error handling but don't show notifications for 404s
      const result = handleApiResponse(response, {
        title: 'Conversation Error',
        notifyOnError: response.status !== 404
      });
      
      if (!result.success) {
        // Just return null for not found, don't create conversations here
        // We'll create conversations explicitly when sending the first message
        return null;
      }
      
      // Process messages to ensure they have the right format
      if (result.data?.messages) {
        result.data.messages = result.data.messages.map(message => ({
          ...message,
          status: MessageStatus.COMPLETE
        }));
      }
      
      return result.data;
    },
    null
  );
}

/**
 * Lists all conversations for the current user
 * @returns Promise with array of conversation summaries or empty array on error
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  return executeServiceCall(
    async () => {
      const response = await fetchApi<ConversationSummary[]>('/api/chat/conversations', {
        method: 'GET',
      });
      
      const result = handleApiResponse(response, {
        title: 'Failed to load conversations'
      });
      
      return result.success && result.data ? result.data : [];
    },
    []
  );
}

/**
 * Deletes a conversation
 * @param conversationId The ID of the conversation to delete 
 * @returns Promise with success flag and optional error message
 */
export async function deleteConversation(conversationId: string): Promise<{ 
  success: boolean;
  message?: string;
  error?: string;
}> {
  return executeServiceCall(
    async () => {
      // Use centralized fetchWithRetry utility for built-in retry handling
      const result = await fetchWithRetry<{ message: string }>(
        `/api/chat/conversation/${conversationId}`,
        { method: 'DELETE' }
      );
      
      if (result.success) {
        return {
          success: true,
          message: result.data?.message || 'Conversation deleted successfully'
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    },
    {
      success: false,
      error: 'Failed to delete conversation due to an unexpected error'
    }
  );
}

/**
 * Updates conversation title
 * @param conversationId The ID of the conversation to update
 * @param title The new title for the conversation
 * @returns Promise with success flag and optional error message
 */
export async function updateConversationTitle(
  conversationId: string, 
  title: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  return executeServiceCall(
    async () => {
      // Try PUT first (backend implementation), fall back to PATCH if that fails
      let response;
      try {
        response = await fetchApi<{ message: string }>(`/api/chat/conversation/${conversationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        });
      } catch (error) {
        // Fallback to PATCH if PUT fails
        response = await fetchApi<{ message: string }>(`/api/chat/conversation/${conversationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        });
      }
      
      const result = handleApiResponse(response, { 
        title: 'Update Failed',
        notifyOnError: true
      });
      
      if (result.success && result.data) {
        showSuccess('Conversation title updated', 'Success');
        return {
          success: true,
          message: result.data.message || 'Title updated successfully'
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    },
    {
      success: false,
      error: 'Failed to update conversation title due to an unexpected error'
    }
  );
}