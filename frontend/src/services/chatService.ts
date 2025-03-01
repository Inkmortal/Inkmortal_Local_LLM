import { fetchApi, ApiResponse } from '../config/api';

export interface ChatRequestParams {
  message: string;
  conversation_id?: string;
  file?: File; // For image or PDF uploads
}

export interface ChatResponse {
  id: string;
  conversation_id: string;
  content: string;
  created_at: string;
  role?: string; // Optional role field for compatibility with backend
}

/**
 * Sends a message to the LLM backend
 * @param params Request parameters including message and optional conversation ID and file
 * @returns Promise with the chat response
 */
export async function sendMessage(params: ChatRequestParams): Promise<ChatResponse> {
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
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to send message');
    }
    
    return response.data;
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
    
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to send message');
    }
    
    return response.data;
  }
}

/**
 * Creates a new conversation
 * @returns Promise with the new conversation ID
 */
export async function createConversation(): Promise<{ conversation_id: string }> {
  const response = await fetchApi<{ conversation_id: string }>('/api/chat/conversation', {
    method: 'POST',
  });
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to create conversation');
  }
  
  return response.data;
}

/**
 * Retrieves conversation history
 * @param conversationId The ID of the conversation to retrieve
 * @returns Promise with the conversation history
 */
export async function getConversation(conversationId: string): Promise<{
  conversation_id: string;
  messages: ChatResponse[];
}> {
  const response = await fetchApi<{
    conversation_id: string;
    messages: ChatResponse[];
  }>(`/api/chat/conversation/${conversationId}`, {
    method: 'GET',
  });
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to retrieve conversation');
  }
  
  return response.data;
}

// Note: MockChatService has been removed as we're now using the real backend API