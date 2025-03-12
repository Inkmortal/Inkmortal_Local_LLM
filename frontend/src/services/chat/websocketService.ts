/**
 * Enhanced WebSocket service for real-time chat updates
 * 
 * This service coordinates the connection manager, message handler,
 * and event emitter to provide a complete WebSocket solution.
 */
import { connectionManager, ConnectionStatus } from './connectionManager';
import { eventEmitter } from './eventEmitter';
import { messageHandler, MessageUpdate } from './messageHandler';
import { MessageStatus } from './types';

// Re-export important types
export { ConnectionStatus } from './connectionManager';
export { MessageType, ContentUpdateMode, MessageUpdate } from './messageHandler';

/**
 * Initialize WebSocket connection and return a promise that resolves when connected
 */
export function initializeWebSocket(token: string): Promise<boolean> {
  console.log('Initializing WebSocket connection with token');
  return connectionManager.connect(token);
}

/**
 * Register a message ID mapping between frontend and backend
 * This ensures messages are correctly routed even if IDs don't match
 */
export function registerMessageId(frontendId: string, backendId: string, conversationId: string): void {
  messageHandler.registerMessageIdMapping(frontendId, backendId, conversationId);
}

/**
 * Subscribe to message updates for a specific message
 * @param callback Function to call when message is updated
 * @returns Function to unsubscribe
 */
export function subscribeToMessageUpdates(callback: (update: MessageUpdate) => void): () => void {
  return eventEmitter.on('message_update', callback);
}

/**
 * Subscribe to connection status updates
 * @param callback Function to call when connection status changes
 * @returns Function to unsubscribe
 */
export function subscribeToConnectionStatus(
  callback: (status: ConnectionStatus) => void
): () => void {
  return eventEmitter.on('connection_status', callback);
}

/**
 * Subscribe to system messages
 * @param callback Function to call when system message is received
 * @returns Function to unsubscribe
 */
export function subscribeToSystemMessages(
  callback: (message: any) => void
): () => void {
  return eventEmitter.on('system_message', callback);
}

/**
 * Subscribe to conversation updates
 * @param callback Function to call when conversation is updated
 * @returns Function to unsubscribe
 */
export function subscribeToConversationUpdates(
  callback: (update: any) => void
): () => void {
  return eventEmitter.on('conversation_update', callback);
}

/**
 * Subscribe to error messages
 * @param callback Function to call when an error occurs
 * @returns Function to unsubscribe
 */
export function subscribeToErrors(
  callback: (error: any) => void
): () => void {
  return eventEmitter.on('error', callback);
}

/**
 * Close WebSocket connection and clean up resources
 */
export function closeWebSocket(): void {
  connectionManager.closeConnection();
}

/**
 * Check if WebSocket is currently connected
 */
export function isWebSocketConnected(): boolean {
  return connectionManager.isConnected();
}

/**
 * Wait for WebSocket connection to be established
 * @param token Auth token
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise that resolves to true when connected or false on timeout
 */
export async function waitForWebSocketConnection(
  token: string, 
  timeout = 5000
): Promise<boolean> {
  // If already connected, return immediately
  if (isWebSocketConnected()) {
    return true;
  }
  
  // Start connection
  try {
    // Create a promise that resolves on timeout
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeout);
    });
    
    // Start connection
    const connectPromise = initializeWebSocket(token);
    
    // Race between connection and timeout
    return Promise.race([connectPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error waiting for WebSocket connection:', error);
    return false;
  }
}

/**
 * Send a message through the WebSocket connection
 * @param message Message to send
 * @returns True if message was sent successfully
 */
export function sendWebSocketMessage(message: any): boolean {
  return connectionManager.sendMessage(message);
}

/**
 * Get the current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return connectionManager.getStatus();
}

/**
 * Safely ensure WebSocket connection with proper error handling
 */
export async function ensureWebSocketConnection(token: string): Promise<boolean> {
  try {
    return await initializeWebSocket(token);
  } catch (error) {
    console.warn('WebSocket connection failed, falling back to polling:', 
      error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}