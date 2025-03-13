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
  ACK = 'ack'
}

// Message ID mappings to track backend<->frontend IDs
interface MessageIdMapping {
  frontendId: string;
  backendId: string;
  conversationId: string;
  timestamp: number;
}

class MessageHandler {
  private static instance: MessageHandler;
  
  // Track message ID mappings
  private messageIdMappings: MessageIdMapping[] = [];
  
  // Interval timer reference
  private cleanupInterval: number | null = null;
  
  // Constructor
  private constructor() {
    // Subscribe to WebSocket messages
    eventEmitter.on('message_received', this.handleMessage.bind(this));
    
    // Clean up old mappings periodically
    this.cleanupInterval = window.setInterval(this.cleanupOldMappings.bind(this), 60000);
  }
  
  // Method to clean up resources
  public cleanup(): void {
    // Clear the cleanup interval
    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
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
    // Remove any existing mappings for this frontend ID
    this.messageIdMappings = this.messageIdMappings.filter(
      mapping => mapping.frontendId !== frontendId
    );
    
    // Add new mapping
    this.messageIdMappings.push({
      frontendId,
      backendId,
      conversationId,
      timestamp: Date.now()
    });
    
    console.log(`Registered message ID mapping: frontend=${frontendId}, backend=${backendId}`);
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
    // Sort by timestamp descending and find the first matching
    return [...this.messageIdMappings]
      .sort((a, b) => b.timestamp - a.timestamp)
      .find(mapping => mapping.conversationId === conversationId);
  }
  
  // Clean up old mappings
  private cleanupOldMappings(): void {
    const now = Date.now();
    const oldMappings = this.messageIdMappings.filter(
      mapping => now - mapping.timestamp > 3600000 // 1 hour
    );
    
    if (oldMappings.length > 0) {
      this.messageIdMappings = this.messageIdMappings.filter(
        mapping => now - mapping.timestamp <= 3600000
      );
      console.log(`Cleaned up ${oldMappings.length} old message ID mappings`);
    }
  }
  
  // Process WebSocket message
  private handleMessage(message: any): void {
    if (!message) return;
    
    // Basic message validation
    if (!message.type) {
      console.warn('Received WebSocket message without type:', message);
      return;
    }
    
    // Process message based on type
    switch (message.type) {
      case MessageType.MESSAGE_UPDATE:
        this.handleMessageUpdate(message);
        break;
        
      case MessageType.CONVERSATION_UPDATE:
        eventEmitter.emit('conversation_update', message);
        break;
        
      case MessageType.SYSTEM_MESSAGE:
        eventEmitter.emit('system_message', message);
        break;
        
      case MessageType.ERROR:
        eventEmitter.emit('error', message);
        break;
        
      case MessageType.ACK:
        // Just a heartbeat response, ignore
        break;
        
      default:
        console.warn(`Unknown message type: ${message.type}`, message);
    }
  }
  
  // Process message updates and normalize
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
    } else if (message.conversation_id) {
      // Try to find by conversation as fallback
      const conversationMapping = this.findMappingByConversationId(message.conversation_id);
      if (conversationMapping) {
        frontendMessageId = conversationMapping.frontendId;
        console.log(`Found message ID by conversation: ${frontendMessageId}`);
        
        // Update mapping for future messages
        this.registerMessageIdMapping(
          frontendMessageId,
          message.message_id,
          message.conversation_id
        );
      }
    }
    
    // Extract message status
    let status: MessageStatus = MessageStatus.STREAMING;
    if (message.status) {
      // Map strings to enum values
      const statusString = message.status.toUpperCase();
      if (statusString === 'COMPLETE') status = MessageStatus.COMPLETE;
      else if (statusString === 'ERROR') status = MessageStatus.ERROR;
      else if (statusString === 'QUEUED') status = MessageStatus.QUEUED;
      else if (statusString === 'PROCESSING') status = MessageStatus.PROCESSING;
    }
    
    // Check completion status
    const isComplete = message.is_complete === true || 
                     message.done === true || 
                     status === MessageStatus.COMPLETE;
    
    // Extract content
    let content = '';
    if (message.assistant_content !== undefined) {
      content = typeof message.assistant_content === 'string' 
        ? message.assistant_content 
        : String(message.assistant_content);
    } else if (message.message?.content !== undefined) {
      content = message.message.content;
    }
    
    // Create normalized update object
    const update: MessageUpdate = {
      messageId: frontendMessageId,
      conversationId: message.conversation_id || '',
      content: content,
      status: isComplete ? MessageStatus.COMPLETE : status,
      contentUpdateMode: ContentUpdateMode.APPEND,
      isComplete: isComplete,
    };
    
    // Add optional fields if present
    if (message.error) update.error = message.error;
    if (message.model) update.model = message.model;
    if (message.section) update.section = message.section;
    
    // Set update mode if specified
    if (message.content_update_type) {
      update.contentUpdateMode = 
        message.content_update_type.toLowerCase() === 'replace' 
          ? ContentUpdateMode.REPLACE 
          : ContentUpdateMode.APPEND;
    }
    
    // Emit the normalized message update event
    eventEmitter.emit('message_update', update);
    
    // Log only for debugging (limit to first 10 chars of content)
    const contentPreview = content.length > 10 
      ? `${content.substring(0, 10)}...` 
      : content;
    console.log(`Processed message update: id=${frontendMessageId}, content="${contentPreview}"`);
  }
}

// Export singleton instance
export const messageHandler = MessageHandler.getInstance();

// Export cleanup function for use in component unmount
export function cleanupMessageHandler(): void {
  messageHandler.cleanup();
}