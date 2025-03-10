/**
 * Error handling utilities for chat services
 * Centralizes all error handling logic for API calls and responses
 */
import { ApiResponse, fetchApi } from '../../config/api';
import { ChatResponse, MessageStatus } from './types';
import { formatErrorMessage, showError } from '../../utils/notifications';

/**
 * List of HTTP status codes that should trigger retry attempts
 */
export const RETRY_STATUS_CODES = [0, 408, 409, 429, 500, 502, 503, 504];

/**
 * Error handling results
 */
export interface ErrorResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
  shouldRetry?: boolean;
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
      if (response.url?.includes('model')) {
        return 'Model not found or not available. The requested model may be offline or not installed.';
      }
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
 * Creates a chat error response with appropriate message
 * @param error Error message, object, or API response
 * @param conversationId Optional conversation ID
 * @param content Optional content to show (defaults to empty for API errors, generic message for other errors)
 * @returns ChatResponse with ERROR status
 */
export function createErrorResponse(
  error: string | Error | ApiResponse<any>,
  conversationId: string = 'unknown',
  content?: string
): ChatResponse {
  let errorMessage: string;
  let responseContent: string;
  
  // Handle different error types
  if (typeof error === 'object' && 'status' in error) {
    // This is an API response
    errorMessage = getErrorMessageFromStatus(error as ApiResponse<any>);
    responseContent = content || '';
  } else {
    // This is a string or Error object
    errorMessage = formatErrorMessage(error);
    responseContent = content || 'An error occurred while processing your request.';
  }
  
  return {
    id: `error-${Date.now()}`,
    conversation_id: conversationId,
    content: responseContent,
    created_at: new Date().toISOString(),
    role: 'system',
    status: MessageStatus.ERROR,
    error: errorMessage,
  };
}

/**
 * Handles API response with standardized error checking and notifications
 * @param response The API response to process
 * @param options Configuration options
 * @returns Standardized error result with data or error information
 */
export function handleApiResponse<T>(
  response: ApiResponse<T>,
  options: {
    title?: string;
    notifyOnError?: boolean;
    ignoredStatuses?: number[];
  } = {}
): ErrorResult<T> {
  // Set defaults
  const { 
    title = 'Error', 
    notifyOnError = true,
    ignoredStatuses = []
  } = options;

  // Success case - just return the data
  if (response.success && response.data) {
    return {
      success: true,
      data: response.data
    };
  }
  
  // Get appropriate error message
  const errorMessage = getErrorMessageFromStatus(response);
  const shouldRetry = RETRY_STATUS_CODES.includes(response.status);
  
  // Show notification if enabled and not in ignored statuses
  if (notifyOnError && !ignoredStatuses.includes(response.status)) {
    showError(errorMessage, title);
  }
  
  // Log error for debugging
  console.error(`API error (${response.status}): ${errorMessage}`);
  
  return {
    success: false,
    data: null,
    error: errorMessage,
    shouldRetry
  };
}

/**
 * Safely executes a service function with standardized error handling
 * @param fn The async function to execute
 * @param errorFallback Fallback value to return on error
 * @param errorHandler Optional custom error handler
 * @returns Result of fn or fallback on error
 */
export async function executeServiceCall<T>(
  fn: () => Promise<T>,
  errorFallback: T,
  errorHandler?: (error: unknown) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error('Service call error:', error);
    if (errorHandler) {
      errorHandler(error);
    }
    return errorFallback;
  }
}

/**
 * Performs an API call with automatic retry for transient errors
 * @param url API endpoint URL
 * @param options Fetch options
 * @param maxRetries Maximum number of retry attempts
 * @returns Standardized result with data or error
 */
export async function fetchWithRetry<T>(
  url: string, 
  options: RequestInit, 
  maxRetries = 2
): Promise<ErrorResult<T>> {
  let retries = maxRetries;
  let lastError = null;
  
  while (retries >= 0) {
    try {
      const response = await fetchApi<T>(url, options);
      
      // Handle different response types
      if (response.success && response.data) {
        return { success: true, data: response.data };
      }
      
      // Don't retry on these status codes
      if ([400, 401, 403, 404].includes(response.status)) {
        return { 
          success: false, 
          error: response.error || `Error ${response.status}` 
        };
      }
      
      // Retry on these status codes
      if (RETRY_STATUS_CODES.includes(response.status)) {
        retries--;
        if (retries < 0) {
          return { 
            success: false, 
            error: response.error || `Failed after ${maxRetries} retries` 
          };
        }
        
        // Exponential backoff
        const backoffTime = Math.pow(2, maxRetries - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;
      }
      
      // For other errors, just return the error
      return { 
        success: false, 
        error: response.error || 'Unknown error' 
      };
    } catch (error) {
      retries--;
      lastError = error instanceof Error ? error.message : 'Unknown error';
      
      if (retries < 0) break;
      
      // Exponential backoff
      const backoffTime = Math.pow(2, maxRetries - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
  
  return {
    success: false,
    error: `Failed after ${maxRetries} attempts: ${lastError}`
  };
}