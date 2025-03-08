/**
 * Notification helper for implementing user-facing error notifications.
 * 
 * INSTRUCTIONS:
 * 
 * 1. Create a new file at frontend/src/utils/notifications.ts with this content.
 * 2. Import this in key files like AuthContext.tsx and useChatState.tsx.
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
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  // For unknown error types
  return 'An unexpected error occurred';
}