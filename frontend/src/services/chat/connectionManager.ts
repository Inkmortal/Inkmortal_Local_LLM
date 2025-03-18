/**
 * WebSocket connection manager
 * 
 * Handles establishing and maintaining the WebSocket connection
 * independently of React component lifecycle.
 */
import { eventEmitter } from './eventEmitter';

// Connection constants
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 500;
const CONNECTION_TIMEOUT_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 20000;
const HEARTBEAT_TIMEOUT_MS = 5000;
const CONNECTION_PERSISTENCE_KEY = 'ws_connection_status';

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

class ConnectionManager {
  private static instance: ConnectionManager;
  
  // WebSocket connection state
  private websocket: WebSocket | null = null;
  private heartbeatInterval: number | null = null;
  private heartbeatTimeout: number | null = null;
  private connectionTimeout: number | null = null;
  private reconnectTimeout: number | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private authToken: string | null = null;
  private connectionPromise: Promise<boolean> | null = null;
  private lastHeartbeatResponse = 0;
  private connectionStatus = ConnectionStatus.DISCONNECTED;

  // Handler references for proper cleanup
  private boundVisibilityHandler: any = null;
  private boundOnlineHandler: any = null;
  private boundOfflineHandler: any = null;
  
  // Private constructor for singleton pattern
  private constructor() {
    this.tryRestoreConnectionState();
    
    // Create bound handler references for later cleanup
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
    this.boundOnlineHandler = this.handleOnline.bind(this);
    this.boundOfflineHandler = this.handleOffline.bind(this);
    
    // Set up visibility change handler to reconnect when tab becomes visible
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }
    
    // Set up online/offline handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.boundOnlineHandler);
      window.addEventListener('offline', this.boundOfflineHandler);
    }
  }

  // Get singleton instance
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  // Try to restore connection state from sessionStorage
  private tryRestoreConnectionState(): void {
    try {
      const savedState = sessionStorage.getItem(CONNECTION_PERSISTENCE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.token) {
          console.log('Found saved WebSocket connection state, attempting to reconnect');
          this.authToken = state.token;
          // Don't immediately reconnect - wait for user action or visibility change
        }
      }
    } catch (e) {
      console.warn('Error restoring WebSocket connection state:', e);
    }
  }

  // Save connection state to sessionStorage
  private saveConnectionState(): void {
    try {
      if (this.authToken) {
        sessionStorage.setItem(CONNECTION_PERSISTENCE_KEY, JSON.stringify({
          token: this.authToken,
          timestamp: Date.now()
        }));
      } else {
        sessionStorage.removeItem(CONNECTION_PERSISTENCE_KEY);
      }
    } catch (e) {
      console.warn('Error saving WebSocket connection state:', e);
    }
  }

  // Handle tab visibility changes
  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      console.log('Tab became visible, checking WebSocket connection');
      // Check if we need to reconnect
      if (this.authToken && (!this.websocket || this.websocket.readyState !== WebSocket.OPEN)) {
        console.log('Reconnecting WebSocket after tab became visible');
        this.connect(this.authToken).catch(err => {
          console.error('Error reconnecting after visibility change:', err);
        });
      }
    }
  }

  // Handle online event
  private handleOnline(): void {
    console.log('Network connection restored, checking WebSocket');
    if (this.authToken && (!this.websocket || this.websocket.readyState !== WebSocket.OPEN)) {
      console.log('Reconnecting WebSocket after network restored');
      // Short delay to let network stabilize
      setTimeout(() => {
        this.connect(this.authToken!).catch(err => {
          console.error('Error reconnecting after network restored:', err);
        });
      }, 1000);
    }
  }

  // Handle offline event
  private handleOffline(): void {
    console.log('Network connection lost, WebSocket will disconnect');
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
  }

  // Update connection status and emit event
  private updateConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      eventEmitter.emit('connection_status', status);
      console.log(`WebSocket connection status changed to: ${status}`);
    }
  }

  // Get WebSocket URL based on current environment
  private getWebSocketUrl(token: string): string {
    // Always derive protocol from current page protocol for security
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Common WebSocket path
    const wsPath = '/api/chat/ws';
    
    // Check if we should use Vite proxy or direct connection
    // Production mode - use same host and protocol (let the proxy handle routing)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const url = `${protocol}//${window.location.host}${wsPath}?token=${encodeURIComponent(token)}`;
      console.log(`Using production WebSocket URL: ${url.replace(token, 'TOKEN_REDACTED')}`);
      return url;
    }
    
    // Development mode with Vite proxy
    if (import.meta.env.DEV) {
      // In development, use the same host as the page but with the API path
      // Vite will proxy this to the backend
      const url = `${protocol}//${window.location.host}${wsPath}?token=${encodeURIComponent(token)}`;
      console.log(`Using development WebSocket URL (via Vite proxy): ${url.replace(token, 'TOKEN_REDACTED')}`);
      return url;
    }
    
    // Fallback to direct backend connection (rarely used, but kept for compatibility)
    const backendPort = '8000';
    const backendHost = `${window.location.hostname}:${backendPort}`;
    const url = `${protocol}//${backendHost}${wsPath}?token=${encodeURIComponent(token)}`;
    
    console.log(`Using direct WebSocket backend: ${url.replace(token, 'TOKEN_REDACTED')}`);
    return url;
  }

  // Initialize WebSocket connection with improved error handling
  public connect(token: string): Promise<boolean> {
    this.authToken = token;
    this.saveConnectionState();
    
    // CRITICAL FIX: Better connection state detection and handling
    
    // Check current WebSocket state and provide detailed status info
    if (this.websocket) {
      const stateStr = 
        this.websocket.readyState === WebSocket.CONNECTING ? "CONNECTING" :
        this.websocket.readyState === WebSocket.OPEN ? "OPEN" :
        this.websocket.readyState === WebSocket.CLOSING ? "CLOSING" :
        this.websocket.readyState === WebSocket.CLOSED ? "CLOSED" : "UNKNOWN";
      
      console.log(`[connectionManager] Current WebSocket state: ${stateStr} (${this.websocket.readyState})`);
    } else {
      console.log('[connectionManager] No existing WebSocket instance found');
    }
    
    // Return existing connection if open - with added logging
    if (this.websocket?.readyState === WebSocket.OPEN) {
      console.log('[connectionManager] WebSocket already connected - reusing existing connection');
      this.updateConnectionStatus(ConnectionStatus.CONNECTED);
      return Promise.resolve(true);
    }
    
    // Return existing promise if connecting - with added verification
    if (this.isConnecting && this.connectionPromise) {
      console.log('[connectionManager] WebSocket connection already in progress - waiting for result');
      return this.connectionPromise;
    }
    
    // If we're in CLOSING state, wait a moment for it to complete before creating a new connection
    if (this.websocket?.readyState === WebSocket.CLOSING) {
      console.log('[connectionManager] WebSocket is currently closing - waiting before reconnecting');
      return new Promise<boolean>((resolve) => {
        setTimeout(() => {
          // After delay, call connect again
          resolve(this.connect(token));
        }, 500);
      });
    }
    
    // Clean up any resources before connecting
    this.cleanupResources();
    
    this.isConnecting = true;
    this.updateConnectionStatus(ConnectionStatus.CONNECTING);
    
    this.connectionPromise = new Promise<boolean>((resolve, reject) => {
      // Set connection timeout
      this.connectionTimeout = window.setTimeout(() => {
        console.error('WebSocket connection timeout');
        this.isConnecting = false;
        this.connectionPromise = null;
        this.cleanupResources();
        this.updateConnectionStatus(ConnectionStatus.ERROR);
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
        this.websocket.onerror = this.handleError.bind(this, reject);
        this.websocket.onmessage = this.handleMessage.bind(this);
      } catch (error) {
        // Handle any synchronous errors during WebSocket creation
        console.error('Error creating WebSocket:', error);
        this.cleanupTimeouts();
        this.isConnecting = false;
        this.connectionPromise = null;
        this.updateConnectionStatus(ConnectionStatus.ERROR);
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
    this.lastHeartbeatResponse = Date.now();
    this.startHeartbeat();
    this.updateConnectionStatus(ConnectionStatus.CONNECTED);
    resolve(true);
  }

  // Handle connection close
  private handleClose(reject: (reason: Error) => void, event: CloseEvent): void {
    const wasConnected = this.websocket?.readyState === WebSocket.OPEN;
    console.log(`WebSocket closed with code ${event.code}: ${event.reason}`);
    this.cleanupTimeouts();
    this.isConnecting = false;
    
    if (wasConnected) {
      this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
    }
    
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

  // Handle connection error
  private handleError(reject: (reason: Error) => void, event: Event): void {
    console.error('WebSocket error:', event);
    this.cleanupTimeouts();
    this.isConnecting = false;
    this.updateConnectionStatus(ConnectionStatus.ERROR);
    
    // Provide better context about the error
    const errorMessage = 'WebSocket connection error - network may be unstable or server unreachable';
    reject(new Error(errorMessage));
    
    // Error is followed by a close event, which will handle reconnection
  }

  // Handle incoming message
  private handleMessage(event: MessageEvent): void {
    try {
      // Update heartbeat timestamp for any message received
      this.lastHeartbeatResponse = Date.now();
      
      // Clear any pending heartbeat timeout
      if (this.heartbeatTimeout !== null) {
        window.clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = null;
      }
      
      // Parse message data
      let data: any;
      
      try {
        // Clean JSON should be directly parseable
        data = JSON.parse(event.data);
        
        // Debug log for readiness protocol messages
        if (data && data.type) {
          if (data.type === 'readiness_confirmed') {
            console.log(`[READINESS-DEBUG] RECEIVED from server: readiness_confirmed message for msgId=${data.message_id?.substring(0,8)}`);
          }
        }
        
        // Emit the parsed message event
        eventEmitter.emit('message_received', data);
      } catch (parseError) {
        console.warn('Received non-JSON WebSocket message, attempting to clean:', event.data);
        
        // Try to detect and handle any remaining SSE-formatted messages
        if (typeof event.data === 'string' && event.data.startsWith('data: ')) {
          // Remove SSE format prefix and try to parse again
          const cleanJson = event.data.substring(6).trim();  // Remove "data: " prefix
          try {
            data = JSON.parse(cleanJson);
            eventEmitter.emit('message_received', data);
          } catch (innerError) {
            // Still not valid JSON, emit as text
            eventEmitter.emit('message_received', {
              type: 'text',
              content: event.data
            });
          }
        } else {
          // Not JSON or SSE format, treat as plain text
          eventEmitter.emit('message_received', {
            type: 'text',
            content: event.data
          });
        }
      }
      
      // Special handling for ack messages (heartbeats)
      if (data?.type === 'ack') {
        // Don't emit acks as they're just for connection health
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  // Enhanced heartbeat with connection status check
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
          this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
          
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
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(1.5, this.reconnectAttempts);
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
            // Notify that we've given up on reconnection
            this.updateConnectionStatus(ConnectionStatus.ERROR);
            console.error('All reconnection attempts failed - connection permanently lost');
          }
        });
      } else {
        console.log('Auth token no longer available, cancelling reconnection');
      }
    }, delay);
  }

  // Clean up all timeouts
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

  // CRITICAL FIX: Enhanced resource cleanup to prevent memory leaks and stale connections
  private cleanupResources(): void {
    // First clean up all timers
    this.cleanupTimeouts();
    
    // Close existing connection if any, with detailed state checks
    if (this.websocket) {
      try {
        // Check current state and handle appropriately
        const currentState = this.websocket.readyState;
        const stateStr = 
          currentState === WebSocket.CONNECTING ? "CONNECTING" :
          currentState === WebSocket.OPEN ? "OPEN" :
          currentState === WebSocket.CLOSING ? "CLOSING" :
          currentState === WebSocket.CLOSED ? "CLOSED" : "UNKNOWN";
          
        console.log(`[connectionManager] Cleaning up WebSocket in ${stateStr} state`);
        
        // Only attempt to close if not already closing/closed
        if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
          console.log('[connectionManager] Closing existing WebSocket connection');
          
          // Use a specific code and reason to help with debugging
          this.websocket.close(1000, 'Client closing connection for new connection');
          
          // Also remove all event listeners to prevent memory leaks
          this.websocket.onopen = null;
          this.websocket.onclose = null;
          this.websocket.onerror = null;
          this.websocket.onmessage = null;
        } else {
          console.log(`[connectionManager] No need to close WebSocket - already in ${stateStr} state`);
        }
      } catch (error) {
        console.error('[connectionManager] Error closing WebSocket:', error);
      } finally {
        // Always null out the reference to allow garbage collection
        this.websocket = null;
      }
    } else {
      console.log('[connectionManager] No WebSocket instance to clean up');
    }
    
    // Reset connection state
    this.isConnecting = false;
    this.connectionPromise = null;
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
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
    this.saveConnectionState(); // Remove from storage
  }

  // Validate connection is truly established and consistent
  public validateConnection(): boolean {
    // Check the WebSocket readyState directly
    if (!this.websocket) {
      console.log('[READINESS-DEBUG] validateConnection: No WebSocket instance');
      return false;
    }
    
    const readyState = this.websocket.readyState;
    const connected = readyState === WebSocket.OPEN;
    
    // Log detailed state info for debugging
    const stateStr = 
      readyState === WebSocket.CONNECTING ? "CONNECTING" :
      readyState === WebSocket.OPEN ? "OPEN" :
      readyState === WebSocket.CLOSING ? "CLOSING" :
      readyState === WebSocket.CLOSED ? "CLOSED" : "UNKNOWN";
      
    console.log(`[READINESS-DEBUG] validateConnection: ${connected ? "CONNECTED" : "NOT CONNECTED"} (${stateStr})`);
    
    // Update status if inconsistent
    if (connected && this.connectionStatus !== ConnectionStatus.CONNECTED) {
      console.warn('[READINESS-DEBUG] Fixing inconsistent connection status (was: ' + this.connectionStatus + ', should be: CONNECTED)');
      this.updateConnectionStatus(ConnectionStatus.CONNECTED);
    } else if (!connected && this.connectionStatus === ConnectionStatus.CONNECTED) {
      console.warn('[READINESS-DEBUG] Fixing inconsistent connection status (was: ' + this.connectionStatus + ', should be: DISCONNECTED)');
      this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
    }
    
    return connected;
  }

  // Check if WebSocket is connected
  public isConnected(): boolean {
    return this.validateConnection();
  }

  // Send a message over the WebSocket
  public sendMessage(data: any): boolean {
    if (!this.isConnected()) {
      console.error('[READINESS-DEBUG] Cannot send message - WebSocket not connected');
      return false;
    }
    
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Add special logging for client_ready messages
      if (typeof data === 'object' && data.type === 'client_ready') {
        const msgId = data.message_id?.substring(0, 8) || 'unknown';
        const convId = data.conversation_id?.substring(0, 8) || 'unknown';
        console.log(`[READINESS-DEBUG] SENDING WebSocket message: type=${data.type}, msgId=${msgId}, convId=${convId}`);
      }
      
      this.websocket!.send(message);
      return true;
    } catch (error) {
      console.error('[READINESS-DEBUG] Error sending WebSocket message:', error);
      return false;
    }
  }

  // Get the current connection status
  public getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
  
  // Add a connection status listener
  public addConnectionListener(callback: (connected: boolean) => void): () => void {
    // First call callback with current status
    const isCurrentlyConnected = this.isConnected();
    setTimeout(() => {
      callback(isCurrentlyConnected);
    }, 0);
    
    // Convert ConnectionStatus to boolean for simpler API
    const statusListener = (status: ConnectionStatus) => {
      const isConnected = status === ConnectionStatus.CONNECTED;
      callback(isConnected);
    };
    
    // Subscribe to status events
    const eventEmitter = require('./eventEmitter').eventEmitter;
    return eventEmitter.on('connection_status', statusListener);
  }
  
  // Cleanup resources and event listeners
  public cleanup(): void {
    // Close WebSocket connection
    this.closeConnection();
    
    // Remove event listeners
    if (typeof document !== 'undefined' && this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
    if (typeof window !== 'undefined') {
      if (this.boundOnlineHandler) {
        window.removeEventListener('online', this.boundOnlineHandler);
        this.boundOnlineHandler = null;
      }
      if (this.boundOfflineHandler) {
        window.removeEventListener('offline', this.boundOfflineHandler);
        this.boundOfflineHandler = null;
      }
    }
  }
}

// Export a singleton instance
export const connectionManager = ConnectionManager.getInstance();

// Export cleanup function for use in component unmount
export function cleanupConnectionManager(): void {
  connectionManager.cleanup();
}