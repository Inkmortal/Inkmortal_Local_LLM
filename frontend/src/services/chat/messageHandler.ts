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
  
  // Store message content for completion handling
  private messageContent: Map<string, string> = new Map();
  
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
  
  // Method to clean up resources
  public cleanup(): void {
    // Clear the cleanup interval
    if (this.cleanupInterval) {
      window.clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear stored message content
    this.messageContent.clear();
    
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
  
  // Clean up old mappings and content
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
      
      // Also remove content for these old messages
      oldMappings.forEach(mapping => {
        this.messageContent.delete(mapping.frontendId);
      });
      
      console.log(`Cleaned up ${oldMappings.length} old message ID mappings and their content`);
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
    
    // Try conversation ID as a last resort
    if (!mapping && message.conversation_id) {
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
    
    // If we still don't have a mapping, log it and use message_id directly
    if (!mapping && frontendMessageId === message.message_id) {
      console.log(`No mapping found for message: ${message.message_id}, using as-is`);
    }
    
    // This section has been moved to where the content is extracted and processed
    // at the core of the message handling flow. This ensures all messages are properly
    // cleaned of JSON metadata at their source, at the point where content is extracted.
    
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
    
    // Extract content - with special handling for completion messages
    let content = '';
    
    // COMPLETION MESSAGES: Handle differently than streaming messages
    if (isComplete) {
      // For completion messages, we want the clean accumulated content
      // Look for stored content first - this skips Ollama's metadata JSON
      const storedContent = this.getStoredMessageContent(frontendMessageId);
      if (storedContent) {
        // Use the content we've been accumulating instead of the final message
        // This avoids the JSON metadata problem entirely
        console.log(`[messageHandler] Using accumulated content for complete message: ${frontendMessageId}`);
        content = storedContent;
      } else if (message.assistant_content) {
        // If we don't have stored content, extract from message but handle JSON carefully
        content = typeof message.assistant_content === 'string' 
          ? message.assistant_content 
          : String(message.assistant_content);
        
        // Check if content contains JSON and remove it
        if (content.includes('{"model":')) {
          const jsonIndex = content.indexOf('{"model":');
          if (jsonIndex > 0) {
            content = content.substring(0, jsonIndex).trim();
            console.log(`[messageHandler] Removed JSON metadata from completion message`);
          }
        }
      }
    } 
    // STREAMING MESSAGES: Normal processing
    else {
      if (message.assistant_content !== undefined) {
        content = typeof message.assistant_content === 'string' 
          ? message.assistant_content 
          : String(message.assistant_content);
        
        // Store the content for this message ID for completion handling
        this.storeMessageContent(frontendMessageId, content);
      } else if (message.message?.content !== undefined) {
        content = message.message.content;
        this.storeMessageContent(frontendMessageId, content);
      }
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