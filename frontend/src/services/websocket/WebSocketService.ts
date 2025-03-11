import { ContentUpdateMode, MessageStatus } from '../../pages/chat/types/message';

export interface WebSocketMessageHandler {
  (message: any): void;
}

export interface WebSocketStatusHandler {
  (connected: boolean): void;
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private authToken: string | null = null;
  private readonly messageHandlers: Set<WebSocketMessageHandler> = new Set();
  private readonly statusHandlers: Set<WebSocketStatusHandler> = new Set();
  private readonly debug: boolean;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor(private readonly baseUrl: string, options: { debug?: boolean } = {}) {
    this.debug = options.debug || false;
  }
  
  public connect(token: string): void {
    if (this.isConnected() || this.isConnecting) return;
    
    this.authToken = token;
    this.isConnecting = true;
    
    // Build WebSocket URL with auth token
    const wsUrl = `${this.baseUrl}/api/chat/ws?token=${encodeURIComponent(token)}`;
    
    if (this.debug) {
      console.log('[WebSocket] Connecting to:', wsUrl);
    }
    
    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }
  
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.cancelReconnect();
    this.stopHeartbeat();
    this.notifyStatusChange(false);
    
    if (this.debug) {
      console.log('[WebSocket] Disconnected');
    }
  }
  
  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
  
  public addMessageHandler(handler: WebSocketMessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    return () => {
      this.messageHandlers.delete(handler);
    };
  }
  
  public addStatusHandler(handler: WebSocketStatusHandler): () => void {
    this.statusHandlers.add(handler);
    
    // Call immediately with current status
    handler(this.isConnected());
    
    return () => {
      this.statusHandlers.delete(handler);
    };
  }
  
  public sendMessage(data: any): void {
    if (!this.isConnected()) {
      console.warn('[WebSocket] Cannot send message, not connected');
      return;
    }
    
    try {
      this.socket!.send(JSON.stringify(data));
    } catch (error) {
      console.error('[WebSocket] Error sending message:', error);
    }
  }
  
  private handleOpen(event: Event): void {
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    if (this.debug) {
      console.log('[WebSocket] Connection established');
    }
    
    this.notifyStatusChange(true);
    
    // Start heartbeat
    this.startHeartbeat();
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (this.debug) {
        console.log('[WebSocket] Message received:', data);
      }
      
      // Notify all handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('[WebSocket] Error in message handler:', error);
        }
      });
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error, event.data);
    }
  }
  
  private handleClose(event: CloseEvent): void {
    this.socket = null;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    if (this.debug) {
      console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
    }
    
    this.notifyStatusChange(false);
    
    // Try to reconnect if appropriate
    this.attemptReconnect();
  }
  
  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event);
  }
  
  private notifyStatusChange(connected: boolean): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('[WebSocket] Error in status handler:', error);
      }
    });
  }
  
  private attemptReconnect(): void {
    if (!this.authToken || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.debug) {
        console.log('[WebSocket] Not reconnecting: max attempts reached or no auth token');
      }
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    if (this.debug) {
      console.log(`[WebSocket] Attempting to reconnect in ${delay}ms (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.authToken!);
    }, delay);
  }
  
  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({ type: 'heartbeat' });
      }
    }, 30000); // 30 seconds
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Message processing utilities
export function parseMessageUpdate(data: any): {
  messageId: string;
  status?: MessageStatus;
  content?: string;
  contentUpdateMode?: ContentUpdateMode;
  section?: string;
  isComplete?: boolean;
  metadata?: Record<string, any>;
} | null {
  // Only process message_update type
  if (data.type !== 'message_update') {
    return null;
  }
  
  const result: any = {
    messageId: data.message_id
  };
  
  // Parse status if present
  if (data.status) {
    result.status = parseStatus(data.status);
  }
  
  // Parse content - prefer assistant_content but fall back to content
  if (data.assistant_content !== undefined || data.content !== undefined) {
    result.content = data.assistant_content ?? data.content;
    
    // Parse update mode
    result.contentUpdateMode = data.content_update_type === 'REPLACE'
      ? ContentUpdateMode.REPLACE
      : ContentUpdateMode.APPEND;
  }
  
  // Parse section if present
  if (data.section) {
    result.section = data.section.toLowerCase();
  }
  
  // Parse completion flag
  if (data.is_complete !== undefined) {
    result.isComplete = Boolean(data.is_complete);
  }

  // Parse additional metadata
  if (data.assistant_message_id) {
    if (!result.metadata) result.metadata = {};
    result.metadata.assistantMessageId = data.assistant_message_id;
  }

  if (data.conversation_id) {
    if (!result.metadata) result.metadata = {};
    result.metadata.conversationId = data.conversation_id;
  }
  
  return result;
}

function parseStatus(status: string): MessageStatus {
  switch (status.toUpperCase()) {
    case 'PENDING':
    case 'QUEUED':
      return MessageStatus.PENDING;
    case 'PROCESSING':
    case 'SENDING':
      return MessageStatus.SENDING;
    case 'STREAMING':
      return MessageStatus.STREAMING;
    case 'COMPLETE':
      return MessageStatus.COMPLETE;
    case 'ERROR':
      return MessageStatus.ERROR;
    default:
      console.warn(`[WebSocket] Unknown status '${status}', defaulting to PENDING`);
      return MessageStatus.PENDING;
  }
}

// Singleton instance
export const webSocketService = new WebSocketService(
  window.location.protocol === 'https:' ? 'wss://' + window.location.host : 'ws://' + window.location.host,
  { debug: true }
);