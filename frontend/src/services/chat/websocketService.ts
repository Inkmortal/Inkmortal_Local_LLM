/**
 * WebSocket service for real-time chat updates
 * EMERGENCY FIX: Completely disabled to prevent UI freezing
 */
import { MessageStatus, ChatResponse, WebSocketMessage } from './types';

// Disabled WebSocket connection
let websocket: WebSocket | null = null;

// Map of message handlers by message ID
const messageHandlers: Record<string, (update: any) => void> = {};

/**
 * Initialize WebSocket connection - DISABLED
 */
export function initializeWebSocket(token: string): Promise<void> {
  console.log('EMERGENCY FIX: WebSocket initialization disabled to prevent freezing');
  // Return a resolved promise to avoid blocking the UI
  return Promise.resolve();
}

/**
 * Setup heartbeat to keep connection alive - DISABLED
 */
function setupHeartbeat() {
  console.log('EMERGENCY FIX: WebSocket heartbeat disabled');
  // Do nothing
}

/**
 * Register a handler for message status updates - DISABLED
 */
export function registerMessageHandler(
  messageId: string,
  handler: (update: any) => void
): () => void {
  console.log(`EMERGENCY FIX: WebSocket handler registration disabled for message ID ${messageId}`);
  // Return a no-op function
  return () => {};
}

/**
 * Close WebSocket connection - DISABLED
 */
export function closeWebSocket() {
  console.log('EMERGENCY FIX: WebSocket close disabled');
  // Do nothing
}

/**
 * Check if WebSocket is connected - DISABLED
 */
export function isWebSocketConnected(): boolean {
  // Always return false to force polling
  return false;
}

/**
 * Conditionally initialize WebSocket - DISABLED
 */
export function ensureWebSocketConnection(token: string): Promise<boolean> {
  console.log('EMERGENCY FIX: WebSocket connection disabled');
  // Always return false to indicate WebSocket is not available
  return Promise.resolve(false);
}