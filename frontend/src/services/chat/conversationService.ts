/**
 * Conversation management services for chat functionality
 */
import { fetchApi } from '../../config/api';
import { ConversationData, ConversationSummary, MessageStatus } from './types';
import { createErrorResponse } from './errorHandling';
import { showError, showInfo, showSuccess } from '../../utils/notifications';

/**
 * Creates a new conversation
 * @param title Optional title for the conversation
 * @returns Promise with the new conversation ID or null on error
 */
export async function createConversation(title?: string): Promise<{ conversation_id: string } | null> {
  try {
    const response = await fetchApi<{ conversation_id: string }>('/api/chat/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    
    if (!response.success || !response.data) {
      // Provide more informative error message based on status code
      let errorMessage = response.error || 'Failed to create conversation';
      
      if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in to create a conversation.';
      } else if (response.status === 0) {
        errorMessage = 'Network error: Cannot connect to server. Please check your connection.';
      }
      
      console.error(`Create conversation error (${response.status}): ${errorMessage}`);
      // Show error notification to user
      showError(errorMessage, 'Conversation Error');
      return null;
    }
    
    return response.data;
  } catch (error) {
    console.error('Unexpected error in createConversation:', error);
    
    // Show notification to user
    showError(
      error instanceof Error ? error.message : 'Failed to create conversation',
      'Conversation Error'
    );
    
    return null;
  }
}

/**
 * Retrieves conversation history
 * @param conversationId The ID of the conversation to retrieve
 * @returns Promise with the conversation history or null on error
 */
export async function getConversation(conversationId: string): Promise<ConversationData | null> {
  try {
    const response = await fetchApi<ConversationData>(`/api/chat/conversation/${conversationId}`, {
      method: 'GET',
    });
    
    if (!response.success || !response.data) {
      let errorMessage = response.error || 'Failed to retrieve conversation';
      
      // Handle different error types
      if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in to view this conversation.';
      } else if (response.status === 404) {
        errorMessage = 'Conversation not found. It may have been deleted.';
      } else if (response.status === 0) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      console.error(`Conversation retrieval error (${response.status}): ${errorMessage}`);
      
      // Return null instead of throwing, to allow for UI-level handling
      return null;
    }
    
    // Process messages to ensure they have the right format
    if (response.data.messages) {
      response.data.messages = response.data.messages.map(message => ({
        ...message,
        status: MessageStatus.COMPLETE
      }));
    }
    
    return response.data;
  } catch (error) {
    console.error('Unexpected error in getConversation:', error);
    return null;
  }
}

/**
 * Lists all conversations for the current user
 * @returns Promise with array of conversation summaries or empty array on error
 */
export async function listConversations(): Promise<ConversationSummary[]> {
  try {
    const response = await fetchApi<ConversationSummary[]>('/api/chat/conversations', {
      method: 'GET',
    });
    
    if (!response.success || !response.data) {
      let errorMessage = response.error || 'Failed to list conversations';
      
      // Handle different error types
      if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in to view your conversations.';
      } else if (response.status === 0) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      console.error(`List conversations error (${response.status}): ${errorMessage}`);
      
      // Show error to user in UI
      showError(errorMessage, 'Failed to load conversations');
      
      // Return empty array instead of throwing
      return [];
    }
    
    return response.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in listConversations:', error);
    
    // Show error to user in UI
    showError(errorMessage, 'Failed to load conversations');
    
    return [];
  }
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
  try {
    console.log(`Deleting conversation ID: ${conversationId}`);
    
    // Use retry logic with reduced retries and exponential backoff
    let retries = 2; // Reduced from 3 to 2 to avoid excessive retries
    let lastError = null;
    
    while (retries > 0) {
      try {
        const response = await fetchApi<{ message: string }>(`/api/chat/conversation/${conversationId}`, {
          method: 'DELETE',
        });
        
        // Log the raw response for debugging
        console.log(`Delete conversation response:`, response);
        
        if (!response.success) {
          let errorMessage = response.error || 'Failed to delete conversation';
          
          // Handle different error types
          if (response.status === 401) {
            errorMessage = 'Authentication required. Please log in to delete this conversation.';
          } else if (response.status === 404) {
            errorMessage = 'Conversation not found. It may have already been deleted.';
            // Consider 404 as success since the conversation is already gone
            return {
              success: true,
              message: 'Conversation already deleted'
            };
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to delete this conversation.';
          } else if (response.status === 409) {
            errorMessage = 'Database conflict. Please try again in a moment.';
            retries--;
            lastError = errorMessage;
            // Exponential backoff - wait longer for each retry
            const backoffTime = retries === 1 ? 2000 : 4000;
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue;
          } else if (response.status === 0) {
            errorMessage = 'Network error. Will retry the deletion.';
            retries--;
            lastError = errorMessage;
            // Exponential backoff - wait longer for each retry
            const backoffTime = retries === 1 ? 2000 : 4000;
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue;
          }
          
          console.error(`Delete conversation error (${response.status}): ${errorMessage}`);
          
          return {
            success: false,
            error: errorMessage
          };
        }
        
        // Successfully deleted - immediately update UI before returning
        console.log('Conversation successfully deleted:', conversationId);
        return {
          success: true,
          message: response.data?.message || 'Conversation deleted successfully'
        };
      } catch (innerError) {
        retries--;
        lastError = innerError instanceof Error ? innerError.message : 'Unknown error';
        console.error(`Delete attempt failed, retries left: ${retries}`, innerError);
        
        if (retries <= 0) break;
        // Exponential backoff - wait longer for each retry
        const backoffTime = retries === 1 ? 2000 : 4000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
    
    // If we got here, all retries failed
    return {
      success: false,
      error: `Failed after multiple attempts: ${lastError}`
    };
  } catch (error) {
    console.error('Unexpected error in deleteConversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
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
  try {
    const response = await fetchApi<{ message: string }>(`/api/chat/conversation/${conversationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    
    if (!response.success || !response.data) {
      let errorMessage = response.error || 'Failed to update conversation title';
      
      // Handle different error types
      if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in to update this conversation.';
      } else if (response.status === 404) {
        errorMessage = 'Conversation not found. It may have been deleted.';
      } else if (response.status === 403) {
        errorMessage = 'You do not have permission to update this conversation.';
      } else if (response.status === 0) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      console.error(`Update conversation title error (${response.status}): ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
    
    return {
      success: true,
      message: response.data.message || 'Conversation title updated successfully'
    };
  } catch (error) {
    console.error('Unexpected error in updateConversationTitle:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}