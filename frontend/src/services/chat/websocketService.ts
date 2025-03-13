/**
 * Enhanced WebSocket service for real-time chat updates
 * 
 * This service coordinates the connection manager, message handler,
 * and event emitter to provide a complete WebSocket solution.
 */
import { connectionManager, ConnectionStatus } from './connectionManager';
import { eventEmitter } from './eventEmitter';
import { messageHandler, MessageType } from './messageHandler';
import { MessageStatus, ContentUpdateMode } from './types';

// Re-export important types
export { ConnectionStatus } from './connectionManager';
export { MessageType } from './messageHandler';
export { MessageStatus, ContentUpdateMode } from './types';
export type { MessageUpdate } from './types';

/**
 * Get authentication token for WebSocket connection
 * Centralized function to ensure consistent token retrieval
 */
export function getAuthToken(): string {
  // Try to get token from localStorage
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.warn('No authentication token found in localStorage');
    throw new Error('Authentication token not found');
  }
  
  return token;
}

/**
 * Initialize WebSocket connection and return a promise that resolves when connected
 * Optionally accepts a token override, otherwise uses the getAuthToken function
 */
export function initializeWebSocket(tokenOverride?: string): Promise<boolean> {
  const token = tokenOverride || getAuthToken();
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
 * Complete cleanup of all WebSocket resources
 * Use this when the application is completely shutting down WebSocket services
 */
export function cleanupWebSocketResources(): void {
  // First close the connection
  connectionManager.closeConnection();
  
  // Then clean up all the singleton instances
  // Import and call the cleanup functions for each manager
  // We're using a try/catch to make sure even if one cleanup fails, others still run
  try {
    // Importing the functions would cause circular dependencies, so we call
    // the cleanup methods directly on the instances we have access to
    connectionManager.cleanup();
    messageHandler.cleanup();
  } catch (error) {
    console.error('Error during WebSocket cleanup:', error);
  }
}

/**
 * Check if WebSocket is currently connected
 */
export function isWebSocketConnected(): boolean {
  return connectionManager.isConnected();
}

/**
 * Wait for WebSocket connection to be established
 * @param tokenOverride Optional auth token override
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise that resolves to true when connected or false on timeout
 */
export async function waitForWebSocketConnection(
  tokenOverride?: string, 
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
    
    // Get token (either from parameter or from storage)
    const token = tokenOverride || getAuthToken();
    
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
export async function ensureWebSocketConnection(tokenOverride?: string): Promise<boolean> {
  try {
    // Use provided token or get from storage
    const token = tokenOverride || getAuthToken();
    return await initializeWebSocket(token);
  } catch (error) {
    console.warn('WebSocket connection failed, falling back to polling:', 
      error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Register handler for updates to a specific message ID
 * @param messageId The message ID to watch for updates
 * @param callback Function to call when update for this message is received
 * @returns Function to unsubscribe
 */
export function registerMessageHandler(messageId: string, callback: (update: MessageUpdate) => void): () => void {
  console.log(`Registering message handler for message ID: ${messageId}`);
  
  // Create an event filter that only passes updates for this message ID
  const filteredCallback = (update: MessageUpdate) => {
    if (update.messageId === messageId) {
      console.log(`Message handler triggered for ${messageId}`);
      callback(update);
    }
  };
  
  // Subscribe to all message updates and filter in the callback
  return eventEmitter.on('message_update', filteredCallback);
}

/**
 * Register a global handler for all message updates
 * Useful for handling updates that don't have a specific message ID
 * @param callback Function to call for any message update
 * @returns Function to unsubscribe
 */
export function registerGlobalMessageHandler(callback: (update: MessageUpdate) => void): () => void {
  console.log('Registering global message handler');
  return eventEmitter.on('message_update', callback);
}

/**
 * Register a listener for connection status changes
 * @param callback Function to call when connection status changes
 * @returns Function to unsubscribe
 */
export function addConnectionListener(callback: (connected: boolean) => void): () => void {
  console.log('Registering connection status listener');
  
  // Map ConnectionStatus enum to boolean for simpler API
  const statusCallback = (status: ConnectionStatus) => {
    const isConnected = status === ConnectionStatus.CONNECTED;
    callback(isConnected);
  };
  
  // Initial callback with current status
  setTimeout(() => {
    statusCallback(connectionManager.getStatus());
  }, 0);
  
  // Subscribe to future status changes
  return eventEmitter.on('connection_status', statusCallback);
}