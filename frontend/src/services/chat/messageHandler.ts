/**
 * Message handler service
 * 
 * Processes WebSocket messages and emits appropriate events
 * Decouples WebSocket handling from React components
 */
import { eventEmitter } from './eventEmitter';
import { MessageStatus, ContentUpdateMode, MessageSection, MessageUpdate } from './types';

// Message types we can receive from the backend
export enum MessageType {
  MESSAGE_UPDATE = 'message_update',
  CONVERSATION_UPDATE = 'conversation_update',
  SYSTEM_MESSAGE = 'system_message',
  ERROR = 'error',
  ACK = 'ack',
  CLIENT_READY = 'client_ready',
  READINESS_CONFIRMED = 'readiness_confirmed',
  MESSAGE_ID_MAPPING = 'message_id_mapping'
}

// Message ID mappings to track backend<->frontend IDs
interface MessageIdMapping {
  frontendId: string;
  backendId: string;
  conversationId: string;
  timestamp: number;
}

// Message metadata type for properly typed metadata
interface MessageMetadata {
  model?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  [key: string]: any;  // Allow additional fields
}

class MessageHandler {
  private static instance: MessageHandler;
  
  // Track message ID mappings
  private messageIdMappings: MessageIdMapping[] = [];
  
  // Store accumulated message content
  private messageContent: Map<string, string> = new Map();
  
  // Store message metadata separately
  private messageMetadata: Map<string, MessageMetadata> = new Map();
  
  // Track message sequence numbers to prevent duplicate processing
  private messageSequence: Map<string, number> = new Map();
  
  // Store message update buffers for ordered processing
  private messageUpdateBuffer: Map<string, MessageUpdate[]> = new Map();
  
  // Flag to prevent concurrent buffer processing
  private processingUpdateBuffer: boolean = false;
  
  // Interval timer reference
  private cleanupInterval: number | null = null;
  
  // Constructor
  private constructor() {
    // Subscribe to WebSocket messages
    eventEmitter.on('message_received', this.handleMessage.bind(this));
    
    // Clean up old mappings periodically
    this.cleanupInterval = window.setInterval(this.cleanupOldMappings.bind(this), 60000);
  }
  
  // Store message content during streaming
  private storeMessageContent(messageId: string, content: string): void {
    this.messageContent.set(messageId, content);
  }
  
  // Get stored message content
  private getStoredMessageContent(messageId: string): string | undefined {
    return this.messageContent.get(messageId);
  }
  
  // Store message metadata
  private storeMessageMetadata(messageId: string, metadata: MessageMetadata): void {
    this.messageMetadata.set(messageId, metadata);
  }
  
  // Get stored message metadata
  private getMessageMetadata(messageId: string): MessageMetadata | undefined {
    return this.messageMetadata.get(messageId);
  }
  
  // Get next sequence number for a message to prevent duplicates
  private getNextSequence(messageId: string): number {
    const current = this.messageSequence.get(messageId) || 0;
    const next = current + 1;
    this.messageSequence.set(messageId, next);
    return next;
  }
  
  // Method to clean up resources
  public cleanup(): void {
    // Clear the cleanup interval
    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear all stored message data
    this.messageContent.clear();
    this.messageMetadata.clear();
    this.messageSequence.clear();
    this.messageUpdateBuffer.clear();
    
    // Unsubscribe from message events
    eventEmitter.off('message_received', this.handleMessage.bind(this));
  }
  
  // Get singleton instance
  public static getInstance(): MessageHandler {
    if (!MessageHandler.instance) {
      MessageHandler.instance = new MessageHandler();
    }
    return MessageHandler.instance;
  }
  
  // Register a message ID mapping
  public registerMessageIdMapping(frontendId: string, backendId: string, conversationId: string): void {
    // Add validation to prevent empty IDs
    if (!frontendId || !backendId) {
      console.error('Cannot register message ID mapping with empty IDs');
      return;
    }
    
    // Remove any existing mappings for both frontend and backend IDs to avoid duplicates
    this.messageIdMappings = this.messageIdMappings.filter(
      mapping => mapping.frontendId !== frontendId && mapping.backendId !== backendId
    );
    
    // Add new mapping
    const mapping = {
      frontendId,
      backendId,
      conversationId,
      timestamp: Date.now()
    };
    
    this.messageIdMappings.push(mapping);
    
    // More detailed logging for debugging
    console.log(`[CRITICAL] Registered message ID mapping: frontend=${frontendId}, backend=${backendId}, conversation=${conversationId}`);
    
    // Initialize empty content to avoid undefined issues
    if (!this.messageContent.has(frontendId)) {
      this.messageContent.set(frontendId, '');
    }
  }
  
  // Validate if a message ID has a valid mapping
  public validateMessageMapping(messageId: string): boolean {
    // Check if this message ID has an existing mapping either as frontend or backend ID
    const hasFrontendMapping = this.findMappingByFrontendId(messageId) !== undefined;
    const hasBackendMapping = this.findMappingByBackendId(messageId) !== undefined;
    
    return hasFrontendMapping || hasBackendMapping;
  }
  
  // Find mapping by frontend ID
  private findMappingByFrontendId(frontendId: string): MessageIdMapping | undefined {
    return this.messageIdMappings.find(mapping => mapping.frontendId === frontendId);
  }
  
  // Find mapping by backend ID
  private findMappingByBackendId(backendId: string): MessageIdMapping | undefined {
    return this.messageIdMappings.find(mapping => mapping.backendId === backendId);
  }
  
  // Find mapping by conversation ID (most recent)
  private findMappingByConversationId(conversationId: string): MessageIdMapping | undefined {
    if (!conversationId || conversationId === 'new') {
      console.log(`Invalid conversation ID for mapping lookup: ${conversationId}`);
      return undefined;
    }
    
    // Sort by timestamp descending and find the first matching
    const mapping = [...this.messageIdMappings]
      .sort((a, b) => b.timestamp - a.timestamp)
      .find(mapping => mapping.conversationId === conversationId);
      
    if (mapping) {
      console.log(`Found mapping for conversation ${conversationId}: frontend=${mapping.frontendId}, backend=${mapping.backendId}`);
    } else {
      console.log(`No mapping found for conversation ID: ${conversationId}`);
    }
    
    return mapping;
  }
  
  // Clean up old mappings and related data
  private cleanupOldMappings(): void {
    const now = Date.now();
    const oldMappings = this.messageIdMappings.filter(
      mapping => now - mapping.timestamp > 3600000 // 1 hour
    );
    
    if (oldMappings.length > 0) {
      // Clean up old mappings
      this.messageIdMappings = this.messageIdMappings.filter(
        mapping => now - mapping.timestamp <= 3600000
      );
      
      // Clean up all related data for these old messages
      oldMappings.forEach(mapping => {
        this.messageContent.delete(mapping.frontendId);
        this.messageMetadata.delete(mapping.frontendId);
        this.messageSequence.delete(mapping.frontendId);
      });
      
      console.log(`Cleaned up ${oldMappings.length} old message ID mappings and their data`);
    }
  }
  
  // Process WebSocket message with better error handling
  private handleMessage(message: any): void {
    if (!message) return;
    
    try {
      // Basic message validation
      if (!message.type) {
        console.warn('Received WebSocket message without type:', message);
        return;
      }
      
      // Enhanced logging for all incoming messages
      console.log(`[messageHandler] Received message type: ${message.type}`, {
        hasMessageId: !!message.message_id,
        hasConversationId: !!message.conversation_id,
        messageType: message.type
      });
      
      // Process message based on type
      switch (message.type) {
        case MessageType.MESSAGE_UPDATE:
          this.handleMessageUpdate(message);
          break;
          
        case MessageType.CONVERSATION_UPDATE:
          console.log('[messageHandler] Received conversation update');
          eventEmitter.emit('conversation_update', message);
          break;
          
        case MessageType.SYSTEM_MESSAGE:
          console.log('[messageHandler] Received system message');
          eventEmitter.emit('system_message', message);
          break;
          
        case MessageType.ERROR:
          console.error('[messageHandler] Received error message:', message.error || 'Unknown error');
          eventEmitter.emit('error', message);
          break;
          
        case MessageType.ACK:
          // Just a heartbeat response, ignore
          break;
          
        case MessageType.READINESS_CONFIRMED:
          console.log('[messageHandler] Received readiness confirmation:', message);
          eventEmitter.emit('readiness_confirmed', message);
          break;
          
        case MessageType.MESSAGE_ID_MAPPING:
          console.log('[messageHandler] Received message ID mapping confirmation:', message);
          
          // Update our mapping if needed
          if (message.message_id && message.mapping_confirmed) {
            if (message.frontend_id && message.frontend_id !== message.message_id) {
              // Update mapping if frontend ID is provided
              this.registerMessageIdMapping(message.frontend_id, message.message_id, message.conversation_id);
            }
            eventEmitter.emit('message_id_mapping', message);
          }
          break;
          
        default:
          console.warn(`[messageHandler] Unknown message type: ${message.type}`, message);
      }
    } catch (error) {
      console.error('[messageHandler] Error processing WebSocket message:', error);
    }
  }
  
  // Process message updates and normalize
  // Process update buffers in sequence to prevent race conditions
  private async processMessageUpdateBuffer(): Promise<void> {
    if (this.processingUpdateBuffer) return;
    
    this.processingUpdateBuffer = true;
    
    try {
      // Process all buffered updates for each message ID in sequence
      for (const [messageId, updates] of this.messageUpdateBuffer.entries()) {
        if (!updates.length) continue;
        
        // Sort updates by sequence (if available) or by arrival time
        updates.sort((a, b) => {
          if (a.sequence !== undefined && b.sequence !== undefined) {
            return a.sequence - b.sequence;
          }
          return 0; // Keep original order if no sequence
        });
        
        // Process each update in order
        for (const update of updates) {
          // Actually emit the event
          eventEmitter.emit('message_update', update);
          await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop
        }
        
        // Clear processed updates
        this.messageUpdateBuffer.delete(messageId);
      }
    } finally {
      this.processingUpdateBuffer = false;
      
      // Check if new updates arrived during processing
      if ([...this.messageUpdateBuffer.values()].some(arr => arr.length > 0)) {
        // If so, process them in the next event loop tick
        setTimeout(() => this.processMessageUpdateBuffer(), 0);
      }
    }
  }

  private handleMessageUpdate(message: any): void {
    if (!message.message_id) {
      console.warn('Received message update without message_id:', message);
      return;
    }
    
    // Find the frontend message ID using our mapping
    let frontendMessageId: string | undefined = message.message_id;
    let mapping = this.findMappingByBackendId(message.message_id);
    
    if (mapping) {
      frontendMessageId = mapping.frontendId;
      console.log(`Found direct mapping for message ID: ${message.message_id} -> ${frontendMessageId}`);
    } else if (message.assistant_message_id) {
      // Try using assistant_message_id first if available (more reliable)
      mapping = this.findMappingByBackendId(message.assistant_message_id);
      if (mapping) {
        frontendMessageId = mapping.frontendId;
        console.log(`Found mapping via assistant_message_id: ${message.assistant_message_id} -> ${frontendMessageId}`);
        
        // Register this mapping for future messages
        this.registerMessageIdMapping(frontendMessageId, message.message_id, message.conversation_id);
      } 
    }
    
    // Try conversation ID as a last resort - enhanced with better logging and recovery
    if (!mapping && message.conversation_id) {
      console.log(`No direct mapping found, attempting lookup by conversation: ${message.conversation_id}`);
      
      const conversationMapping = this.findMappingByConversationId(message.conversation_id);
      if (conversationMapping) {
        frontendMessageId = conversationMapping.frontendId;
        console.log(`Found message ID by conversation: conversation=${message.conversation_id}, frontendId=${frontendMessageId}`);
        
        // Update mapping for future messages
        this.registerMessageIdMapping(
          frontendMessageId,
          message.message_id,
          message.conversation_id
        );
      } else {
        // More aggressive recovery - check if any mapping has a temporary conversation ID
        console.log(`No mapping found by real conversation ID, checking for temporary mappings`);
        
        const tempMapping = this.messageIdMappings.find(m => 
          m.conversationId === 'new' || 
          m.conversationId === null || 
          m.conversationId === undefined
        );
        
        if (tempMapping) {
          frontendMessageId = tempMapping.frontendId;
          console.log(`Found message with temporary conversation ID, updating to: ${message.conversation_id}`);
          
          // Update the mapping with the real conversation ID
          this.registerMessageIdMapping(
            tempMapping.frontendId,
            message.message_id,
            message.conversation_id
          );
        } else {
          console.log(`No temporary mappings found - using backend ID directly: ${message.message_id}`);
        }
      }
    }
    
    // If we still don't have a mapping, log it and use message_id directly
    if (!mapping && frontendMessageId === message.message_id) {
      console.log(`No mapping found for message: ${message.message_id}, using as-is`);
    }
    
    // Get sequence number for this message to prevent duplicates
    const sequenceNumber = this.getNextSequence(frontendMessageId);
    console.log(`Processing message update #${sequenceNumber} for ${frontendMessageId}`);
    
    // Extract message status (backend uses lowercase status values)
    let status: MessageStatus = MessageStatus.STREAMING;
    if (message.status) {
      // Convert status string to lowercase for case-insensitive mapping
      const statusString = message.status.toLowerCase();
      
      // Map directly to our enum values which match lowercase backend values
      if (statusString === 'complete') status = MessageStatus.COMPLETE;
      else if (statusString === 'error') status = MessageStatus.ERROR;
      else if (statusString === 'queued') status = MessageStatus.QUEUED;
      else if (statusString === 'processing') status = MessageStatus.PROCESSING;
      else if (statusString === 'preparing') status = MessageStatus.PREPARING;
      
      // Log status mapping for debugging
      console.log(`[messageHandler] Message status from backend: ${message.status} → ${status}`);
    }
    
    // Check completion status
    const isComplete = message.is_complete === true || 
                     message.done === true || 
                     status === MessageStatus.COMPLETE;
    
    // Process metadata - now properly separated from content
    if (message.metadata) {
      // Store metadata properly
      this.storeMessageMetadata(frontendMessageId, message.metadata);
    }
    
    // Extract content
    let content = '';
    if (message.assistant_content !== undefined) {
      content = typeof message.assistant_content === 'string' 
        ? message.assistant_content 
        : String(message.assistant_content);
    } else if (message.message?.content !== undefined) {
      content = message.message.content;
    }
    
    // Skip empty content updates (likely metadata-only updates)
    if (content.length === 0 && !isComplete) {
      console.log(`Skipping empty content update for ${frontendMessageId}`);
      return;
    }
    
    // For streaming updates, accumulate content properly
    const currentContent = this.getStoredMessageContent(frontendMessageId) || '';
    
    // Use a proper content update based on mode
    let contentUpdateMode = ContentUpdateMode.APPEND;
    
    // Check for explicit content update mode from backend
    if (message.content_update_mode === 'REPLACE') {
      contentUpdateMode = ContentUpdateMode.REPLACE;
    } else if (message.content_update_type === 'replace') {
      contentUpdateMode = ContentUpdateMode.REPLACE;
    } else if (message.is_final_message === true) {
      // If this is marked as a final message, use REPLACE mode to prevent duplication
      contentUpdateMode = ContentUpdateMode.REPLACE;
      console.log(`Final message detected for ${frontendMessageId}, using REPLACE mode`);
    }
      
    // Update our stored content with better logging
    console.log(`[messageHandler] Content update for ${frontendMessageId}`, {
      mode: contentUpdateMode,
      newContentLength: content.length,
      prevTotalLength: currentContent.length
    });
    
    const newContent = contentUpdateMode === ContentUpdateMode.REPLACE ? 
      content : currentContent + content;
      
    this.storeMessageContent(frontendMessageId, newContent);
    
    // Create normalized update object with proper separation of concerns
    const update: MessageUpdate = {
      messageId: frontendMessageId,
      conversationId: message.conversation_id || '',
      content: content,               // Only the new content, not accumulated
      status: isComplete ? MessageStatus.COMPLETE : status,
      contentUpdateMode: contentUpdateMode,
      isComplete: isComplete,
      sequence: message.sequence || sequenceNumber, // Use backend sequence if available, otherwise local
      metadata: message.metadata || {} // Properly include metadata
    };
    
    // Add optional fields if present
    if (message.error) update.error = message.error;
    
    // Buffer the update instead of emitting immediately
    if (!this.messageUpdateBuffer.has(frontendMessageId)) {
      this.messageUpdateBuffer.set(frontendMessageId, []);
    }
    
    // Add to buffer
    this.messageUpdateBuffer.get(frontendMessageId)!.push(update);
    
    // Trigger processing if not already in progress
    if (!this.processingUpdateBuffer) {
      this.processMessageUpdateBuffer();
    }
    
    // Log only for debugging (limit to first 10 chars of content)
    const contentPreview = content.length > 10 
      ? `${content.substring(0, 10)}...` 
      : content;
    console.log(`Buffered message update: id=${frontendMessageId}, sequence=${update.sequence}, content="${contentPreview}"`);
  }
}

// Export singleton instance
export const messageHandler = MessageHandler.getInstance();

// Export cleanup function for use in component unmount
export function cleanupMessageHandler(): void {
  messageHandler.cleanup();
}