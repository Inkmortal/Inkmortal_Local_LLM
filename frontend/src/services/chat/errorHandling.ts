/**
 * Error handling utilities for chat services
 */
import { ApiResponse } from '../../config/api';
import { ChatResponse, MessageStatus } from './types';

/**
 * Creates an error response for message errors
 * @param error Error message or object
 * @param conversationId Optional conversation ID
 * @returns ChatResponse with ERROR status
 */
export function createErrorResponse(
  error: string | Error,
  conversationId: string = 'unknown'
): ChatResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return {
    id: `error-${Date.now()}`,
    conversation_id: conversationId,
    content: 'An error occurred while processing your request.',
    created_at: new Date().toISOString(),
    role: 'system',
    status: MessageStatus.ERROR,
    error: errorMessage,
  };
}

/**
 * Creates a standardized error message based on HTTP status code
 * @param response API response with error
 * @returns User-friendly error message
 */
export function getErrorMessageFromStatus(response: ApiResponse<any>): string {
  switch (response.status) {
    case 401:
      return 'Authentication required. Please log in to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    case 504:
      return 'Request timed out. The server took too long to respond.';
    case 0:
      return 'Network error. Please check your internet connection.';
    default:
      return response.error || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Creates a chat response with the appropriate error message based on API response
 * @param response API response with error
 * @param conversationId Optional conversation ID
 * @returns ChatResponse with ERROR status and appropriate message
 */
export function createErrorResponseFromApiResponse(
  response: ApiResponse<any>,
  conversationId: string = 'unknown'
): ChatResponse {
  const errorMessage = getErrorMessageFromStatus(response);
  
  return {
    id: `error-${Date.now()}`,
    conversation_id: conversationId,
    content: '',
    created_at: new Date().toISOString(),
    role: 'system',
    status: MessageStatus.ERROR,
    error: errorMessage,
  };
}