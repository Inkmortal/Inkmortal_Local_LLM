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

// Flag to avoid multiple connection attempts simultaneously
let connectingPromise: Promise<void> | null = null;

/**
 * Initialize WebSocket connection
 */
export function initializeWebSocket(token: string): Promise<void> {
  // Debug information
  console.log('initializeWebSocket called with token');
  
  // If already connecting, return the existing promise
  if (connectingPromise) {
    console.log('WebSocket connection already in progress, returning existing promise');
    return connectingPromise;
  }
  
  // If already connected, just resolve
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return Promise.resolve();
  }
  
  // Store token for reconnects
  authToken = token;
  
  // Create connection promise
  connectingPromise = new Promise<void>((resolve, reject) => {
    // Set a timeout to prevent hanging indefinitely
    const timeoutId = setTimeout(() => {
      console.error('WebSocket connection attempt timed out');
      connectingPromise = null;
      reject(new Error('WebSocket connection timeout'));
    }, 10000); // 10 seconds timeout
    
    try {
      console.log('Attempting to create WebSocket connection');
      
      // Close existing connection if any
      if (websocket && websocket.readyState !== WebSocket.CLOSED) {
        console.log('Closing existing WebSocket connection');
        websocket.close();
      }
      
      // Create new connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Try to determine the backend URL more safely
      let host = window.location.host;
      // If in development, we might need to use a fixed port
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        host = 'localhost:8000'; // Hardcode the backend port for development
      }
      
      const wsUrl = `${protocol}//${host}/api/chat/ws?token=${token}`;
      console.log('Creating WebSocket connection to URL:', wsUrl);
      
      // Create the WebSocket with explicit error handling
      websocket = new WebSocket(wsUrl);
      console.log('WebSocket object created, waiting for connection...');
      
      // Setup event handlers
      websocket.onopen = () => {
        console.log('WebSocket connection established successfully');
        clearTimeout(timeoutId);
        setupHeartbeat();
        connectingPromise = null;
        resolve();
      };
      
      websocket.onclose = (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        
        // Clear the connecting promise
        connectingPromise = null;
        
        // If this happens during connection, reject the promise
        if (timeoutId) {
          clearTimeout(timeoutId);
          reject(new Error(`Connection closed: ${event.reason}`));
        }
        
        // Try to reconnect after delay if closed unexpectedly
        if (event.code !== 1000 && event.code !== 1001) {
          setTimeout(() => {
            if (authToken) {
              // Reset the connecting promise
              connectingPromise = null;
              console.log('Attempting to reconnect WebSocket...');
              initializeWebSocket(authToken)
                .catch(err => console.error('WebSocket reconnect failed:', err));
            }
          }, 5000);
        }
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error occurred:', error);
        // Clear the timeout
        clearTimeout(timeoutId);
        // Reset the connecting promise
        connectingPromise = null;
        // Close the socket to trigger cleanup
        if (websocket) {
          websocket.close();
        }
        // Reject the promise with the error
        reject(error);
      };
      
      websocket.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          
          // Handle different message types
          if (data.type === 'message_update') {
            console.log(`Message update for ID ${data.message_id}:`, data.status);
            const handler = messageHandlers[data.message_id];
            if (handler) {
              handler(data);
            } else {
              console.warn(`No handler registered for message ID ${data.message_id}`);
            }
          } else if (data.type === 'ack') {
            console.log('Received heartbeat acknowledgment');
          } else {
            console.log('Received unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      clearTimeout(timeoutId);
      connectingPromise = null;
      reject(error);
    }
  });
  
  return connectingPromise;
}

/**
 * Setup heartbeat to keep connection alive
 */
function setupHeartbeat() {
  console.log('Setting up WebSocket heartbeat');
  // Send heartbeat every 30 seconds
  const interval = setInterval(() => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      try {
        console.log('Sending heartbeat to server');
        websocket.send('heartbeat');
      } catch (error) {
        console.error('Error sending heartbeat:', error);
        clearInterval(interval);
      }
    } else {
      console.log('WebSocket not open, clearing heartbeat interval');
      clearInterval(interval);
    }
  }, 30000);
  
  // Clear interval when connection closes
  if (websocket) {
    websocket.addEventListener('close', () => {
      console.log('WebSocket closed, clearing heartbeat interval');
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
  console.log(`Registering handler for message ID ${messageId}`);
  messageHandlers[messageId] = handler;
  
  // Return a function to unregister the handler
  return () => {
    console.log(`Unregistering handler for message ID ${messageId}`);
    delete messageHandlers[messageId];
  };
}

/**
 * Close WebSocket connection
 */
export function closeWebSocket() {
  console.log('Closing WebSocket connection');
  if (websocket && websocket.readyState !== WebSocket.CLOSED) {
    websocket.close(1000, 'Client closed connection');
  }
  websocket = null;
  authToken = null;
  connectingPromise = null;
}

/**
 * Check if WebSocket is connected
 */
export function isWebSocketConnected(): boolean {
  const connected = websocket !== null && websocket.readyState === WebSocket.OPEN;
  console.log(`WebSocket connection check: ${connected ? 'connected' : 'not connected'}`);
  return connected;
}

/**
 * Conditionally initialize WebSocket
 * Falls back to no WebSocket if connection fails
 */
export function ensureWebSocketConnection(token: string): Promise<boolean> {
  console.log('Ensuring WebSocket connection is available');
  
  return initializeWebSocket(token)
    .then(() => {
      console.log('WebSocket connection established successfully');
      return true;
    })
    .catch(error => {
      console.error('WebSocket connection failed, continuing without WebSocket:', error);
      // Don't throw, just return false to indicate WebSocket is not available
      return false;
    });
}