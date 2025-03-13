/**
 * Streaming message manager
 * 
 * Handles streaming message updates with content buffering
 * Provides hooks for integrating with React components
 */
import { useEffect, useCallback, useState, useRef } from 'react';
import { 
  subscribeToMessageUpdates, 
  registerMessageId,
  MessageUpdate,
  ContentUpdateMode
} from '../../../services/chat/websocketService';
import { MessageStatus } from '../types/message';

// Interface for buffered content state
interface BufferedContent {
  [messageId: string]: string;
}

// Debounce configuration
interface DebounceConfig {
  delay: number;
  maxSize: number;
}

/**
 * Manager class for streaming message content
 * Handles buffering and debouncing of updates
 */
export class StreamingMessageManager {
  private static instance: StreamingMessageManager;
  
  // Buffered content and timers
  private contentBuffer: BufferedContent = {};
  private debounceTimers: Record<string, number> = {};
  private updateCallbacks: Map<string, Set<(update: MessageUpdate) => void>> = new Map();
  private globalCallbacks: Set<(update: MessageUpdate) => void> = new Set();
  
  // Default debounce configuration
  private debounceConfig: DebounceConfig = {
    delay: 50,   // ms between updates
    maxSize: 100  // max tokens before forcing update
  };
  
  // Private constructor for singleton
  private constructor() {
    // Subscribe to message updates
    subscribeToMessageUpdates(this.handleMessageUpdate.bind(this));
  }
  
  // Get singleton instance
  public static getInstance(): StreamingMessageManager {
    if (!StreamingMessageManager.instance) {
      StreamingMessageManager.instance = new StreamingMessageManager();
    }
    return StreamingMessageManager.instance;
  }
  
  // Set debounce configuration
  public setDebounceConfig(config: Partial<DebounceConfig>): void {
    this.debounceConfig = { ...this.debounceConfig, ...config };
  }
  
  // Register a callback for a specific message
  public registerUpdateCallback(
    messageId: string, 
    callback: (update: MessageUpdate) => void
  ): () => void {
    if (!this.updateCallbacks.has(messageId)) {
      this.updateCallbacks.set(messageId, new Set());
    }
    
    this.updateCallbacks.get(messageId)!.add(callback);
    
    // Return unregister function
    return () => {
      const callbacks = this.updateCallbacks.get(messageId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.updateCallbacks.delete(messageId);
        }
      }
    };
  }
  
  // Register a global callback for all message updates
  public registerGlobalCallback(
    callback: (update: MessageUpdate) => void
  ): () => void {
    this.globalCallbacks.add(callback);
    
    // Return unregister function
    return () => {
      this.globalCallbacks.delete(callback);
    };
  }
  
  // Register a message ID mapping
  public registerMessageIdMapping(
    frontendId: string, 
    backendId: string, 
    conversationId: string
  ): void {
    registerMessageId(frontendId, backendId, conversationId);
  }
  
  // Handle incoming message update
  private handleMessageUpdate(update: MessageUpdate): void {
    const { messageId, content, contentUpdateMode } = update;
    
    // Skip empty content updates
    if (content === undefined || content === null) return;
    
    // Add to content buffer
    if (!this.contentBuffer[messageId]) {
      this.contentBuffer[messageId] = '';
    }
    
    // Update buffer based on mode
    if (contentUpdateMode === ContentUpdateMode.REPLACE) {
      this.contentBuffer[messageId] = content;
    } else {
      this.contentBuffer[messageId] += content;
    }
    
    // Clear any existing timer
    if (this.debounceTimers[messageId]) {
      window.clearTimeout(this.debounceTimers[messageId]);
      delete this.debounceTimers[messageId];
    }
    
    // If buffer is getting large or message is complete, update immediately
    const shouldUpdateImmediately = 
      this.contentBuffer[messageId].length >= this.debounceConfig.maxSize ||
      update.isComplete === true ||
      update.status === MessageStatus.COMPLETE;
    
    if (shouldUpdateImmediately) {
      this.flushUpdate(messageId, update);
    } else {
      // Otherwise debounce the update
      this.debounceTimers[messageId] = window.setTimeout(() => {
        this.flushUpdate(messageId, update);
      }, this.debounceConfig.delay);
    }
  }
  
  // Flush buffered content for a message
  private flushUpdate(messageId: string, originalUpdate: MessageUpdate): void {
    // Create updated message with buffered content
    const bufferedUpdate: MessageUpdate = {
      ...originalUpdate,
      content: this.contentBuffer[messageId]
    };
    
    // Clear buffer after flushing
    delete this.contentBuffer[messageId];
    
    // Call callbacks for this message
    const messageCallbacks = this.updateCallbacks.get(messageId);
    if (messageCallbacks) {
      messageCallbacks.forEach(callback => {
        try {
          callback(bufferedUpdate);
        } catch (error) {
          console.error(`Error in message update callback for ${messageId}:`, error);
        }
      });
    }
    
    // Call global callbacks
    this.globalCallbacks.forEach(callback => {
      try {
        callback(bufferedUpdate);
      } catch (error) {
        console.error('Error in global update callback:', error);
      }
    });
  }
  
  // Get buffered content for a message
  public getBufferedContent(messageId: string): string {
    return this.contentBuffer[messageId] || '';
  }
  
  // Clear all buffers and timers
  public clear(): void {
    // Clear all timers
    Object.keys(this.debounceTimers).forEach(messageId => {
      window.clearTimeout(this.debounceTimers[messageId]);
    });
    
    // Reset state
    this.contentBuffer = {};
    this.debounceTimers = {};
  }
  
  // Complete cleanup of all resources
  public cleanup(): void {
    // Clear all buffers and timers
    this.clear();
    
    // Clear all callbacks
    this.updateCallbacks.clear();
    this.globalCallbacks.clear();
    
    // Unsubscribe from message updates
    // Note: This assumes the subscription is stored somewhere globally
    // We might need to store the unsubscribe function from subscribeToMessageUpdates
  }
}

// Export singleton instance
export const streamingManager = StreamingMessageManager.getInstance();

// Export cleanup function for use in component unmount
export function cleanupStreamingManager(): void {
  streamingManager.cleanup();
}

/**
 * Hook to subscribe to message updates
 * @param messageId Message ID to subscribe to
 * @returns Object with streaming content and status
 */
export function useMessageStreaming(messageId?: string) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<MessageStatus>(MessageStatus.PENDING);
  const [isComplete, setIsComplete] = useState(false);
  
  // Use a ref for the latest message ID to avoid stale closures
  const messageIdRef = useRef(messageId);
  messageIdRef.current = messageId;
  
  // Update handler
  const handleUpdate = useCallback((update: MessageUpdate) => {
    if (update.messageId === messageIdRef.current) {
      setContent(update.content);
      setStatus(update.status);
      setIsComplete(!!update.isComplete);
    }
  }, []);
  
  // Subscribe to updates
  useEffect(() => {
    if (!messageId) return;
    
    // Register for updates to this message
    const unsubscribe = streamingManager.registerUpdateCallback(messageId, handleUpdate);
    
    // Check if there's already buffered content
    const bufferedContent = streamingManager.getBufferedContent(messageId);
    if (bufferedContent) {
      setContent(bufferedContent);
    }
    
    return unsubscribe;
  }, [messageId, handleUpdate]);
  
  return {
    content,
    status,
    isComplete,
    isStreaming: status === MessageStatus.STREAMING
  };
}

/**
 * Hook to subscribe to all message updates
 * @returns Function to register message ID and receive updates
 */
export function useStreamingMessages() {
  // Callback to register a message and get its updates
  const registerMessage = useCallback((
    frontendId: string, 
    backendId: string, 
    conversationId: string
  ) => {
    streamingManager.registerMessageIdMapping(frontendId, backendId, conversationId);
  }, []);
  
  // Register for all message updates
  const subscribeToMessages = useCallback((
    callback: (update: MessageUpdate) => void
  ) => {
    return streamingManager.registerGlobalCallback(callback);
  }, []);
  
  return {
    registerMessage,
    subscribeToMessages
  };
}