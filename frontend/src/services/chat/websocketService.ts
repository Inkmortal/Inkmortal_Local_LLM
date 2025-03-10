/**
 * WebSocket service for real-time chat updates
 */
import { MessageStatus, ChatResponse, WebSocketMessage } from './types';

// Singleton WebSocket connection
let websocket: WebSocket | null = null;

// Map of message handlers by message ID
const messageHandlers: Record<string, (update: any) => void> = {};

// Authentication token
let authToken: string | null = null;

/**
 * Initialize WebSocket connection
 */
export function initializeWebSocket(token: string): Promise<void> {
  // Store token for reconnects
  authToken = token;
  
  return new Promise((resolve, reject) => {
    try {
      // Close existing connection if any
      if (websocket && websocket.readyState !== WebSocket.CLOSED) {
        websocket.close();
      }
      
      // Create new connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/chat/ws?token=${token}`;
      
      websocket = new WebSocket(wsUrl);
      
      // Setup event handlers
      websocket.onopen = () => {
        console.log('WebSocket connection established');
        setupHeartbeat();
        resolve();
      };
      
      websocket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        
        // Try to reconnect after delay if closed unexpectedly
        if (event.code !== 1000 && event.code !== 1001) {
          setTimeout(() => {
            if (authToken) {
              initializeWebSocket(authToken)
                .catch(err => console.error('WebSocket reconnect failed:', err));
            }
          }, 5000);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
      
      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          
          // Handle different message types
          if (data.type === 'message_update') {
            const handler = messageHandlers[data.message_id];
            if (handler) {
              handler(data);
            }
          } else if (data.type === 'ack') {
            // Heartbeat acknowledgment - nothing to do
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      reject(error);
    }
  });
}

/**
 * Setup heartbeat to keep connection alive
 */
function setupHeartbeat() {
  // Send heartbeat every 30 seconds
  const interval = setInterval(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send('heartbeat');
    } else {
      clearInterval(interval);
    }
  }, 30000);
  
  // Clear interval when connection closes
  if (websocket) {
    websocket.addEventListener('close', () => {
      clearInterval(interval);
    });
  }
}

/**
 * Register a handler for message status updates
 */
export function registerMessageHandler(
  messageId: string,
  handler: (update: any) => void
): () => void {
  messageHandlers[messageId] = handler;
  
  // Return a function to unregister the handler
  return () => {
    delete messageHandlers[messageId];
  };
}

/**
 * Close WebSocket connection
 */
export function closeWebSocket() {
  if (websocket && websocket.readyState !== WebSocket.CLOSED) {
    websocket.close(1000, 'Client closed connection');
  }
  websocket = null;
  authToken = null;
}

/**
 * Check if WebSocket is connected
 */
export function isWebSocketConnected(): boolean {
  return websocket !== null && websocket.readyState === WebSocket.OPEN;
}