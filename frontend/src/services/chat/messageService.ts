/**
 * Message services for chat functionality
 */
import { fetchApi } from '../../config/api';
import { ChatRequestParams, ChatResponse, MessageStatus } from './types';
import { createErrorResponse, createErrorResponseFromApiResponse } from './errorHandling';
import { showError } from '../../utils/notifications';

/**
 * Sends a message to the LLM backend
 * @param params Request parameters including message and optional conversation ID and file
 * @returns Promise with the chat response
 */
export async function sendMessage(params: ChatRequestParams): Promise<ChatResponse> {
  try {
    // Check if we need to handle file upload
    if (params.file) {
      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('message', params.message);
      formData.append('file', params.file);
      
      if (params.conversation_id) {
        formData.append('conversation_id', params.conversation_id);
      }
      
      // Use fetchApi with FormData and our standardized response format
      const response = await fetchApi<ChatResponse>('/api/chat/message', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary for FormData
      });
      
      // Handle different error types based on status code
      if (!response.success || !response.data) {
        return createErrorResponseFromApiResponse(response, params.conversation_id);
      }
      
      // Add COMPLETE status to successful responses
      const result = {
        ...response.data,
        status: MessageStatus.COMPLETE
      };
      
      return result;
    } else {
      // Regular JSON request for text-only messages
      const response = await fetchApi<ChatResponse>('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: params.message,
          conversation_id: params.conversation_id,
        }),
      });
      
      // Handle different error types based on status code
      if (!response.success || !response.data) {
        // Show error notification to user
        const errorMessage = response.error || 'Failed to send message to server';
        showError(errorMessage, 'Message Error');
        
        return createErrorResponseFromApiResponse(response, params.conversation_id);
      }
      
      // Add COMPLETE status to successful responses
      const result = {
        ...response.data,
        status: MessageStatus.COMPLETE
      };
      
      return result;
    }
  } catch (error) {
    // Handle unexpected errors and show user-facing notification
    console.error('Unexpected error in sendMessage:', error);
    
    // Use notification utility
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while sending message';
    showError(errorMessage, 'Chat Error');
    
    return createErrorResponse(errorMessage, params.conversation_id);
  }
}