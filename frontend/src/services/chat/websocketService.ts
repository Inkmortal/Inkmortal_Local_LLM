/**
 * WebSocket service for real-time chat updates
 * Implements a singleton WebSocket connection with heartbeat, reconnection,
 * and message handling capabilities
 */
import { MessageStatus, ChatResponse, WebSocketMessage } from './types';

// Connection constants
const MAX_RECONNECT_ATTEMPTS = 3;
const BASE_RECONNECT_DELAY_MS = 1000;
const CONNECTION_TIMEOUT_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;

// WebSocket connection manager - singleton pattern
class WebSocketManager {
  private static instance: WebSocketManager;
  private websocket: WebSocket | null = null;
  private heartbeatInterval: number | null = null;
  private connectionTimeout: number | null = null;
  private reconnectTimeout: number | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private authToken: string | null = null;
  private messageHandlers = new Map<string, (update: any) => void>();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private connectionPromise: Promise<boolean> | null = null;

  // Private constructor enforces singleton pattern
  private constructor() {}

  // Get singleton instance
  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  // Get WebSocket URL based on current environment
  private getWebSocketUrl(token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    
    // Use localhost:8000 for development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      host = 'localhost:8000';
    }
    
    return `${protocol}//${host}/api/chat/ws?token=${token}`;
  }

  // Initialize WebSocket connection
  public connect(token: string): Promise<boolean> {
    this.authToken = token;
    
    // Return existing connection if open
    if (this.websocket?.readyState === WebSocket.OPEN) {
      return Promise.resolve(true);
    }
    
    // Return existing promise if connecting
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }
    
    this.isConnecting = true;
    this.connectionPromise = new Promise<boolean>((resolve, reject) => {
      // Set connection timeout
      this.clearTimeouts();
      this.connectionTimeout = window.setTimeout(() => {
        this.isConnecting = false;
        reject(new Error('Connection timeout'));
      }, CONNECTION_TIMEOUT_MS);
      
      // Close existing connection if any
      this.closeConnection();
      
      try {
        // Create new WebSocket
        const wsUrl = this.getWebSocketUrl(token);
        this.websocket = new WebSocket(wsUrl);
        
        // Setup event handlers
        this.websocket.onopen = () => this.handleOpen(resolve);
        this.websocket.onclose = (event) => this.handleClose(event, reject);
        this.websocket.onerror = this.handleError;
        this.websocket.onmessage = this.handleMessage;
      } catch (error) {
        this.clearTimeouts();
        this.isConnecting = false;
        reject(error);
      }
    });
    
    return this.connectionPromise;
  }

  // Handle connection open
  private handleOpen = (resolve: (value: boolean) => void): void => {
    this.clearTimeouts();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    this.notifyListeners(true);
    resolve(true);
  };

  // Handle connection close
  private handleClose = (event: CloseEvent, reject: (reason: Error) => void): void => {
    this.clearTimeouts();
    this.isConnecting = false;
    this.notifyListeners(false);
    
    // Attempt reconnect for unexpected closures
    if (event.code !== 1000 && event.code !== 1001) {
      this.attemptReconnect();
    } else {
      this.websocket = null;
      reject(new Error(`Connection closed: ${event.reason}`));
    }
  };

  // Handle connection error
  private handleError = (): void => {
    this.clearTimeouts();
    this.isConnecting = false;
    this.notifyListeners(false);
  };

  // Handle incoming message
  private handleMessage = (event: MessageEvent): void => {
    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      
      if (data.type === 'message_update' && data.message_id) {
        const handler = this.messageHandlers.get(data.message_id);
        if (handler) {
          handler(data);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  };

  // Start heartbeat to keep connection alive
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    if (!this.websocket) return;
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        try {
          this.websocket.send('heartbeat');
        } catch (error) {
          this.stopHeartbeat();
        }
      } else {
        this.stopHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Attempt reconnection with exponential backoff
  private attemptReconnect(): void {
    if (!this.authToken || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
    
    // Calculate delay with exponential backoff
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
    }
    
    // Set new reconnect timeout
    this.reconnectTimeout = window.setTimeout(() => {
      if (this.authToken) {
        this.connect(this.authToken).catch(() => {});
      }
    }, delay);
  }

  // Notify all connection listeners
  private notifyListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  // Clear all timeouts
  private clearTimeouts(): void {
    if (this.connectionTimeout !== null) {
      window.clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
  }

  // Close connection and clean up
  public closeConnection(): void {
    if (this.websocket) {
      try {
        this.websocket.close(1000, 'Client closing connection');
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    }
    
    this.clearTimeouts();
    this.websocket = null;
    this.authToken = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.notifyListeners(false);
  }

  // Check if WebSocket is connected
  public isConnected(): boolean {
    return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
  }

  // Register message handler
  public registerHandler(messageId: string, handler: (update: any) => void): () => void {
    this.messageHandlers.set(messageId, handler);
    
    return () => {
      this.messageHandlers.delete(messageId);
    };
  }

  // Add connection listener
  public addListener(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.add(listener);
    
    // Notify with current state if connected
    if (this.websocket) {
      try {
        listener(this.websocket.readyState === WebSocket.OPEN);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    }
    
    return () => {
      this.connectionListeners.delete(listener);
    };
  }
}

// Get WebSocket manager instance
const wsManager = WebSocketManager.getInstance();

// Public API

/**
 * Initialize WebSocket connection
 */
export function initializeWebSocket(token: string): Promise<boolean> {
  return wsManager.connect(token);
}

/**
 * Register a handler for message status updates
 */
export function registerMessageHandler(
  messageId: string,
  handler: (update: any) => void
): () => void {
  return wsManager.registerHandler(messageId, handler);
}

/**
 * Add connection state listener
 */
export function addConnectionListener(
  listener: (connected: boolean) => void
): () => void {
  return wsManager.addListener(listener);
}

/**
 * Close WebSocket connection
 */
export function closeWebSocket(): void {
  wsManager.closeConnection();
}

/**
 * Check if WebSocket is connected
 */
export function isWebSocketConnected(): boolean {
  return wsManager.isConnected();
}

/**
 * Safely initialize WebSocket with fallback
 */
export async function ensureWebSocketConnection(token: string): Promise<boolean> {
  try {
    return await initializeWebSocket(token);
  } catch (error) {
    console.warn('WebSocket connection failed, falling back to polling');
    return false;
  }
}