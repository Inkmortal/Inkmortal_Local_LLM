/**
 * Notification helper for implementing user-facing error notifications.
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationData {
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number; // in milliseconds
}

/**
 * Show a notification to the user using the app's notification system
 */
export function showNotification(data: NotificationData): void {
  window.dispatchEvent(new CustomEvent('app:notification', { 
    detail: data
  }));
}

/**
 * Show an error notification
 */
export function showError(message: string, title: string = 'Error'): void {
  showNotification({
    type: 'error',
    message,
    title
  });
}

/**
 * Show an info notification
 */
export function showInfo(message: string, title: string = 'Info'): void {
  showNotification({
    type: 'info',
    message,
    title
  });
}

/**
 * Show a success notification
 */
export function showSuccess(message: string, title: string = 'Success'): void {
  showNotification({
    type: 'success',
    message,
    title
  });
}

/**
 * Show a warning notification
 */
export function showWarning(message: string, title: string = 'Warning'): void {
  showNotification({
    type: 'warning',
    message,
    title
  });
}

/**
 * Format an error for user display
 * Takes an unknown error and returns a user-friendly message
 */
export function formatErrorMessage(error: unknown): string {
  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle API Response errors with status property
  if (error && typeof error === 'object' && 'status' in error && 'error' in error) {
    const apiError = error as { status: number; error?: string };
    if (apiError.error) {
      return apiError.error;
    }
    
    // Status-based fallback messages
    switch (apiError.status) {
      case 401: return 'Authentication required. Please log in to continue.';
      case 403: return 'You do not have permission to perform this action.';
      case 404: return 'The requested resource was not found.';
      case 429: return 'Too many requests. Please try again later.';
      case 500: return 'Server error. Please try again later.';
      case 504: return 'Request timed out. The server took too long to respond.';
      case 0: return 'Network error. Please check your internet connection.';
      default: return `Error ${apiError.status}`;
    }
  }
  
  // Handle plain objects with error/message property
  if (error && typeof error === 'object') {
    // Try to extract known error properties
    const errorObj = error as Record<string, any>;
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    }
    if (errorObj.error && typeof errorObj.error === 'string') {
      return errorObj.error;
    }
    if (errorObj.detail && typeof errorObj.detail === 'string') {
      return errorObj.detail;
    }
    
    // Try to format as JSON for debugging
    try {
      return `Error object: ${JSON.stringify(error)}`;
    } catch (e) {
      // If JSON stringify fails, fall back to generic message
    }
  }
  
  // For unknown error types
  return 'An unexpected error occurred';
}