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

  // Private constructor for singleton pattern
  private constructor() {
    this.tryRestoreConnectionState();
    
    // Set up visibility change handler to reconnect when tab becomes visible
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
    
    // Set up online/offline handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
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
    this.saveConnectionState();
    
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
    this.updateConnectionStatus(ConnectionStatus.DISCONNECTED);
    this.saveConnectionState(); // Remove from storage
  }

  // Check if WebSocket is connected
  public isConnected(): boolean {
    return this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
  }

  // Send a message over the WebSocket
  public sendMessage(data: any): boolean {
    if (!this.isConnected()) {
      console.error('Cannot send message - WebSocket not connected');
      return false;
    }
    
    try {
      this.websocket!.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  // Get the current connection status
  public getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
}

// Export a singleton instance
export const connectionManager = ConnectionManager.getInstance();