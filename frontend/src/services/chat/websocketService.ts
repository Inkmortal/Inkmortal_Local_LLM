/**
 * WebSocket service for real-time chat updates - optimized version
 * Implements a singleton WebSocket connection with proper cleanup and resource management
 */
import { MessageStatus, ChatResponse, WebSocketMessage } from './types';

// Connection constants
const MAX_RECONNECT_ATTEMPTS = 5; // Increased to handle unstable connections better
const BASE_RECONNECT_DELAY_MS = 1000;
const CONNECTION_TIMEOUT_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 5000; // How long to wait for heartbeat response
const MESSAGE_HANDLER_LIMIT = 50; // Prevent unbounded growth of handlers

// WebSocket connection manager - singleton pattern with improved resource management
class WebSocketManager {
  private static instance: WebSocketManager;
  private websocket: WebSocket | null = null;
  private heartbeatInterval: number | null = null;
  private heartbeatTimeout: number | null = null; // New: timeout for heartbeat response
  private connectionTimeout: number | null = null;
  private reconnectTimeout: number | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private authToken: string | null = null;
  private messageHandlers = new Map<string, { handler: (update: any) => void, timestamp: number }>();
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private connectionPromise: Promise<boolean> | null = null;
  private lastCleanupTime = 0;
  private lastHeartbeatResponse = 0; // New: track last heartbeat response time

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
    
    // Production mode - use same host and protocol
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // Use current host - the proxy should handle routing to backend
      return `${protocol}//${window.location.host}/api/chat/ws?token=${token}`;
    }
    
    // Development mode - use fixed backend port 8000
    const backendPort = '8000'; // Hardcoded for simplicity
    const backendHost = `${window.location.hostname}:${backendPort}`;
    
    console.log(`Using WebSocket backend at ${protocol}//${backendHost}/api/chat/ws`);
    return `${protocol}//${backendHost}/api/chat/ws?token=${token}`;
  }

  // Initialize WebSocket connection with improved error handling
  public connect(token: string): Promise<boolean> {
    this.authToken = token;
    
    // Return existing connection if open
    if (this.websocket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected - reusing existing connection');
      return Promise.resolve(true);
    }
    
    // Return existing promise if connecting
    if (this.isConnecting && this.connectionPromise) {
      console.log('WebSocket connection already in progress - waiting for result');
      return this.connectionPromise;
    }
    
    // Clean up any resources before connecting
    this.cleanupResources();
    
    this.isConnecting = true;
    this.connectionPromise = new Promise<boolean>((resolve, reject) => {
      // Set connection timeout
      this.connectionTimeout = window.setTimeout(() => {
        console.error('WebSocket connection timeout');
        this.isConnecting = false;
        this.connectionPromise = null;
        this.cleanupResources();
        reject(new Error('Connection timeout - server may be unreachable'));
      }, CONNECTION_TIMEOUT_MS);
      
      try {
        // Create new WebSocket with proper error handling
        const wsUrl = this.getWebSocketUrl(token);
        console.log(`Creating new WebSocket connection to ${wsUrl}`);
        
        this.websocket = new WebSocket(wsUrl);
        
        // Setup event handlers with proper binding to prevent "this" context issues
        this.websocket.onopen = this.handleOpen.bind(this, resolve);
        this.websocket.onclose = this.handleClose.bind(this, reject);
        this.websocket.onerror = this.handleError.bind(this, reject); // Added reject parameter
        this.websocket.onmessage = this.handleMessage.bind(this);
      } catch (error) {
        // Handle any synchronous errors during WebSocket creation
        console.error('Error creating WebSocket:', error);
        this.cleanupTimeouts();
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(new Error(`Failed to create WebSocket connection: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
    
    return this.connectionPromise;
  }

  // Handle connection open
  private handleOpen(resolve: (value: boolean) => void): void {
    console.log('WebSocket connection opened successfully');
    this.cleanupTimeouts();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.lastHeartbeatResponse = Date.now(); // Initialize heartbeat timestamp
    this.startHeartbeat();
    this.notifyListeners(true);
    resolve(true);
  }

  // Handle connection close with improved diagnostics
  private handleClose(reject: (reason: Error) => void, event: CloseEvent): void {
    console.log(`WebSocket closed with code ${event.code}: ${event.reason}`);
    this.cleanupTimeouts();
    this.isConnecting = false;
    this.notifyListeners(false);
    
    // Only attempt reconnect for unexpected closures and if we have an auth token
    if (this.authToken && event.code !== 1000 && event.code !== 1001) {
      console.log('Unexpected WebSocket closure - attempting reconnect');
      this.attemptReconnect();
    } else {
      console.log('Expected WebSocket closure or no auth token - not reconnecting');
      // Reset state on expected closure
      this.websocket = null;
      this.connectionPromise = null;
      
      // Provide more context in the error message
      let errorMessage = `Connection closed: ${event.reason || 'No reason provided'}`;
      if (event.code === 1006) {
        errorMessage = `Connection abnormally closed (code 1006) - server may be unreachable`;
      } else if (event.code === 1008) {
        errorMessage = `Connection closed due to policy violation (code 1008) - authentication may have failed`;
      } else if (event.code === 1011) {
        errorMessage = `Server encountered an error (code 1011)`;
      }
      
      reject(new Error(errorMessage));
    }
  }

  // Handle connection error with improved error reporting
  private handleError(reject: (reason: Error) => void, event: Event): void {
    console.error('WebSocket error:', event);
    this.cleanupTimeouts();
    this.isConnecting = false;
    this.notifyListeners(false);
    
    // Provide better context about the error
    const errorMessage = 'WebSocket connection error - network may be unstable or server unreachable';
    reject(new Error(errorMessage));
    
    // Error is followed by a close event, which will handle reconnection
  }

  // Handle incoming message with improved heartbeat tracking
  private handleMessage(event: MessageEvent): void {
    try {
      // Periodically clean up old message handlers
      this.cleanupOldHandlers();
      
      // Update heartbeat timestamp for any message received
      this.lastHeartbeatResponse = Date.now();
      
      // Clear any pending heartbeat timeout
      if (this.heartbeatTimeout !== null) {
        window.clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
      
      // Parse message
      const data = JSON.parse(event.data) as WebSocketMessage;
      
      if (data.type === 'message_update' && data.message_id) {
        const handlerData = this.messageHandlers.get(data.message_id);
        if (handlerData) {
          // Update timestamp to show this handler is still active
          this.messageHandlers.set(data.message_id, {
            ...handlerData,
            timestamp: Date.now()
          });
          
          // Call the handler
          handlerData.handler(data);
        }
      } else if (data.type === 'ack') {
        // Heartbeat acknowledgment - logging would be too noisy
      } else {
        console.warn('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  // Enhanced heartbeat with connection status check and auto-reconnect
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    if (!this.websocket) return;
    
    console.log('Starting WebSocket heartbeat');
    this.heartbeatInterval = window.setInterval(() => {
      // If connection is not open, don't try to send heartbeat
      if (this.websocket?.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not open, stopping heartbeat and checking connection');
        this.stopHeartbeat();
        
        // Check if we should attempt reconnection
        if (this.authToken && !this.isConnecting && !this.reconnectTimeout) {
          console.log('Connection lost, initiating reconnect after heartbeat check');
          this.attemptReconnect();
        }
        return;
      }
      
      // Check if we haven't received a response for too long
      const now = Date.now();
      const sinceLastResponse = now - this.lastHeartbeatResponse;
      
      if (sinceLastResponse > HEARTBEAT_INTERVAL_MS * 2) {
        console.warn(`No heartbeat response for ${sinceLastResponse}ms, connection may be dead`);
        
        // Force close and reconnect if connection appears dead
        if (this.websocket) {
          console.log('Connection appears dead, forcing close and reconnect');
          this.stopHeartbeat();
          
          try {
            this.websocket.close(4000, 'Connection appears dead (no heartbeat response)');
          } catch (error) {
            console.error('Error closing dead connection:', error);
          }
          
          this.websocket = null;
          
          // Attempt to reconnect if we have an auth token
          if (this.authToken && !this.isConnecting && !this.reconnectTimeout) {
            this.attemptReconnect();
          }
        }
        return;
      }
      
      try {
        // Send heartbeat and set up timeout for response
        this.websocket.send(JSON.stringify({ type: 'heartbeat' }));
        
        // Set timeout to detect missing heartbeat response
        if (this.heartbeatTimeout !== null) {
          window.clearTimeout(this.heartbeatTimeout);
        }
        
        this.heartbeatTimeout = window.setTimeout(() => {
          console.warn('No heartbeat response received within timeout period');
          this.heartbeatTimeout = null;
        }, HEARTBEAT_TIMEOUT_MS);
      } catch (error) {
        console.error('Error sending heartbeat:', error);
        this.stopHeartbeat();
        
        // Attempt to reconnect on heartbeat error
        if (this.authToken && !this.isConnecting && !this.reconnectTimeout) {
          this.attemptReconnect();
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  // Enhanced heartbeat cleanup
  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.heartbeatTimeout !== null) {
      window.clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // Clean up old message handlers
  private cleanupOldHandlers(): void {
    // Only run cleanup every 10 seconds to avoid excessive work
    const now = Date.now();
    if (now - this.lastCleanupTime < 10000) return;
    
    this.lastCleanupTime = now;
    
    // Check if we have too many handlers
    if (this.messageHandlers.size <= MESSAGE_HANDLER_LIMIT) return;
    
    console.log(`Cleaning up old message handlers (current count: ${this.messageHandlers.size})`);
    
    // Find handlers older than 2 minutes (inactive)
    const expirationTime = now - 120000;
    const handlersToRemove: string[] = [];
    
    this.messageHandlers.forEach((data, messageId) => {
      if (data.timestamp < expirationTime) {
        handlersToRemove.push(messageId);
      }
    });
    
    // Remove old handlers
    handlersToRemove.forEach(messageId => {
      this.messageHandlers.delete(messageId);
    });
    
    if (handlersToRemove.length > 0) {
      console.log(`Removed ${handlersToRemove.length} stale message handlers`);
    }
  }

  // Enhanced reconnection with better error handling
  private attemptReconnect(): void {
    if (!this.authToken || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached or no auth token - giving up`);
      // Reset state when giving up to prevent stale connections
      this.websocket = null;
      this.connectionPromise = null;
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    // Set new reconnect timeout with proper cleanup
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      
      if (this.authToken) {
        console.log('Attempting reconnection now');
        // Safely attempt reconnection with proper error handling
        this.connect(this.authToken).catch((error) => {
          console.error('Reconnection attempt failed:', error);
          
          // If this wasn't the last attempt, the reconnect will be triggered again by handleClose
          if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            // Notify listeners that we've given up on reconnection
            this.notifyListeners(false);
            console.error('All reconnection attempts failed - connection permanently lost');
          }
        });
      } else {
        console.log('Auth token no longer available, cancelling reconnection');
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

  // Clean up all timeouts with enhanced handling
  private cleanupTimeouts(): void {
    if (this.connectionTimeout !== null) {
      window.clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.reconnectTimeout !== null) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.heartbeatTimeout !== null) {
      window.clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
    
    this.stopHeartbeat();
  }

  // Clean up all resources
  private cleanupResources(): void {
    this.cleanupTimeouts();
    
    // Close existing connection if any
    if (this.websocket) {
      try {
        // Only close if not already closing/closed
        if (this.websocket.readyState === WebSocket.OPEN || this.websocket.readyState === WebSocket.CONNECTING) {
          console.log('Closing existing WebSocket connection');
          this.websocket.close(1000, 'Client closing connection for new connection');
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      this.websocket = null;
    }
  }

  // Close connection and clean up
  public closeConnection(): void {
    console.log('Closing WebSocket connection and cleaning up all resources');
    
    if (this.websocket) {
      try {
        // Only close if not already closing/closed
        if (this.websocket.readyState === WebSocket.OPEN || this.websocket.readyState === WebSocket.CONNECTING) {
          this.websocket.close(1000, 'Client closing connection');
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    }
    
    // Full reset of all state
    this.cleanupTimeouts();
    this.websocket = null;
    this.authToken = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.messageHandlers.clear();
    this.notifyListeners(false);
  }

  // Check if WebSocket is connected
  public isConnected(): boolean {
    const isConnected = this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
    console.log(`WebSocket connection status check: ${isConnected ? "connected" : "disconnected"}`);
    return isConnected;
  }

  // Register message handler
  public registerHandler(messageId: string, handler: (update: any) => void): () => void {
    console.log(`Registering handler for message ${messageId}`);
    
    // Store handler with timestamp
    this.messageHandlers.set(messageId, {
      handler,
      timestamp: Date.now()
    });
    
    // Automatically clean up old handlers when we add new ones
    this.cleanupOldHandlers();
    
    // Return unregister function
    return () => {
      console.log(`Unregistering handler for message ${messageId}`);
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
    
    // Return unregister function
    return () => {
      this.connectionListeners.delete(listener);
    };
  }
}

// Get WebSocket manager instance
const wsManager = WebSocketManager.getInstance();

// Public API - simplified to reduce code complexity

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
export function isWebSocketConnected(): boolean {
  const isConnected = wsManager.isConnected();
  console.log(`WebSocket connection status: ${isConnected ? "connected" : "disconnected"}`);
  return isConnected;
}
  return wsManager.isConnected();
}

/**
 * Safely initialize WebSocket with fallback
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