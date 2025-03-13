/**
 * Utility functions for chat hooks
 * 
 * This file contains common utilities used by the chat hooks
 * to avoid code duplication and maintain better organization
 */

import { MessageStatus, ContentUpdateMode, MessageRole } from '../types/message';

/**
 * Processes WebSocket update for a target message
 * 
 * @param update The update data from WebSocket
 * @param targetMessageId The message ID to update
 * @param state Current chat state
 * @param dispatch Function to dispatch actions to the reducer
 * @param contentBufferRef Reference to content buffer
 * @param debounceTimersRef Reference to debounce timers
 */
export function handleWebSocketUpdate(
  update: any, 
  targetMessageId: string,
  state: any,
  dispatch: any,
  contentBufferRef: React.MutableRefObject<Record<string, string>>,
  debounceTimersRef: React.MutableRefObject<Record<string, NodeJS.Timeout>>
) {
  // STEP 1: Handle message status updates - these can go through immediately
  if (update.status) {
    // Map status string directly to our enum values (case-insensitive)
    const statusStr = typeof update.status === 'string' ? update.status.toUpperCase() : update.status;
    
    const messageStatus = 
      statusStr === "PROCESSING" || statusStr === MessageStatus.PROCESSING ? MessageStatus.PROCESSING :
      statusStr === "STREAMING" || statusStr === MessageStatus.STREAMING ? MessageStatus.STREAMING :
      statusStr === "COMPLETE" || statusStr === MessageStatus.COMPLETE ? MessageStatus.COMPLETE :
      statusStr === "ERROR" || statusStr === MessageStatus.ERROR ? MessageStatus.ERROR :
      statusStr === "QUEUED" || statusStr === MessageStatus.QUEUED ? MessageStatus.QUEUED :
      MessageStatus.PENDING;
    
    // Only send status updates for non-streaming statuses to avoid render thrashing
    // Always pass streaming statuses through completion detection below
    if (messageStatus !== MessageStatus.STREAMING) {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          messageId: targetMessageId,
          status: messageStatus,
          metadata: {
            conversationId: update.conversation_id,
            error: update.error,
            model: update.model
          }
        }
      });
    }
  }
  
  // STEP 2: Handle content updates - buffer these to prevent render thrashing
  const hasContent = 
    update.assistant_content !== undefined || 
    (update.message?.content !== undefined);
  
  if (hasContent) {
    // Extract content from various formats
    const content = update.assistant_content !== undefined
      ? (typeof update.assistant_content === 'string' 
          ? update.assistant_content 
          : String(update.assistant_content))
      : (update.message?.content || '');
    
    if (content) {
      console.log(`Received content token: "${content.substring(0, 25)}${content.length > 25 ? '...' : ''}"`);
      
      // CRITICAL FIX: Better handling of content buffering to ensure tokens are preserved
      if (!contentBufferRef.current[targetMessageId]) {
        // Initialize buffer if it doesn't exist yet
        contentBufferRef.current[targetMessageId] = '';
      }
      
      // Explicitly add content with careful string concatenation to avoid undefined + string issues
      contentBufferRef.current[targetMessageId] += content;
      
      // Log buffer size periodically to track growth
      if (contentBufferRef.current[targetMessageId].length % 1000 === 0) {
        console.log(`Content buffer for ${targetMessageId} size: ${contentBufferRef.current[targetMessageId].length} characters`);
      }
      
      // Clear any existing timer for this message
      if (debounceTimersRef.current[targetMessageId]) {
        clearTimeout(debounceTimersRef.current[targetMessageId]);
      }
      
      // Schedule a debounced update (50ms - reduced from 100ms for more responsive updates)
      debounceTimersRef.current[targetMessageId] = setTimeout(() => {
        // Check if we have content to update
        const bufferedContent = contentBufferRef.current[targetMessageId];
        if (!bufferedContent) return;
        
        // Log the buffered update
        console.log(`Dispatching buffered update for ${targetMessageId} - content length: ${bufferedContent.length}`);
        
        // Get existing message if any
        const existingMessage = state.messages[targetMessageId];
        
        // CRITICAL FIX: Improved content update mode determination
        // When we're streaming, we almost always want to APPEND mode to preserve tokens
        // Only use REPLACE for the initial message or when explicitly requested
        const updateMode = ContentUpdateMode.APPEND; // Always append for streaming
        
        // Log the update mode for debugging
        console.log(`Using update mode: ${updateMode} for message ${targetMessageId}`);
        
        // Verify the existing message vs buffer content
        if (existingMessage && existingMessage.content && bufferedContent.length < existingMessage.content.length) {
          console.warn(`CONTENT ISSUE: Buffer content (${bufferedContent.length} chars) is smaller than existing message (${existingMessage.content.length} chars)`);
        }
        
        if (!existingMessage) {
          console.log(`Update for message ${targetMessageId} not in state yet - reducer will create it`);
          
          // CRITICAL ISSUE FIX: If we don't have a message in state yet, but we've received an
          // update for it, and we know we have an assistantMessageId, it might be that the IDs
          // don't match. Try to find a message created by sendMessage() that doesn't have
          // any content yet.
          
          // Safety check - make sure this is a freshly created placeholder
          const lookForPlaceholder = Object.values(state.messages).find(m => 
            m.role === MessageRole.ASSISTANT && 
            m.content === '' && 
            (m.status === MessageStatus.STREAMING || m.status === MessageStatus.PENDING) &&
            m.conversationId === update.conversation_id
          );
          
          if (lookForPlaceholder) {
            console.log(`CRITICAL FIX: Found placeholder message ${lookForPlaceholder.id} that can be updated instead of ${targetMessageId}`);
            // Replace the target message ID with our existing placeholder
            targetMessageId = lookForPlaceholder.id;
          }
        } else {
          console.log(`Appending content to existing message ${targetMessageId}`);
        }
        
        // Send the update with the buffered content
        if (update.section) {
          // Section-specific update
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              messageId: targetMessageId,
              content: bufferedContent,
              section: update.section,
              contentUpdateMode: updateMode, // Use appropriate mode
              status: MessageStatus.STREAMING,
              metadata: {
                conversationId: update.conversation_id,
                model: update.model
              }
            }
          });
        } else {
          // Main content update
          dispatch({
            type: 'UPDATE_MESSAGE',
            payload: {
              messageId: targetMessageId,
              content: bufferedContent,
              contentUpdateMode: updateMode, // Use appropriate mode
              status: MessageStatus.STREAMING,
              metadata: {
                conversationId: update.conversation_id,
                model: update.model
              }
            }
          });
        }
        
        // Clear the buffer after update
        contentBufferRef.current[targetMessageId] = '';
      }, 50);
    }
    
    // Store model info in metadata if available - low frequency, so can go through
    if (update.model) {
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          messageId: targetMessageId,
          metadata: { model: update.model }
        }
      });
    }
  }
  
  // STEP 3: Handle completion - these should go through immediately
  const isComplete = 
    update.is_complete === true || 
    update.done === true || 
    update.status === "COMPLETE" ||
    update.status === "complete" ||
    update.status === MessageStatus.COMPLETE;
  
  if (isComplete) {
    // Clear any pending updates and timers
    if (debounceTimersRef.current[targetMessageId]) {
      clearTimeout(debounceTimersRef.current[targetMessageId]);
      delete debounceTimersRef.current[targetMessageId];
    }
    
    // Flush any remaining buffered content
    const remainingContent = contentBufferRef.current[targetMessageId];
    if (remainingContent) {
      // Send the final content update
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          messageId: targetMessageId,
          content: remainingContent,
          contentUpdateMode: ContentUpdateMode.REPLACE,
          metadata: {
            conversationId: update.conversation_id,
            model: update.model
          }
        }
      });
      
      // Clear the buffer
      delete contentBufferRef.current[targetMessageId];
    }
    
    // Now mark as complete
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: {
        messageId: targetMessageId,
        status: MessageStatus.COMPLETE,
        isComplete: true,
        metadata: {
          conversationId: update.conversation_id,
          model: update.model
        }
      }
    });
  }
}

/**
 * Find the most appropriate message to update when receiving a global update
 * 
 * @param update The update data from WebSocket
 * @param targetMessageId Current target message ID
 * @param state Current chat state
 * @returns The message ID that should be updated
 */
export function findTargetMessageForUpdate(update: any, targetMessageId: string | null, state: any): string | null {
  // If the message references the ID directly, use it
  if (update.message_id && state.messages[update.message_id]) {
    return update.message_id;
  }
  
  // If we have a target ID and it exists in state, use it
  if (targetMessageId && state.messages[targetMessageId]) {
    return targetMessageId;
  }
  
  // Find all assistant messages in order of recency
  const assistantMessages = Object.values(state.messages)
    .filter((msg: any) => msg.role === MessageRole.ASSISTANT)
    .sort((a: any, b: any) => b.timestamp - a.timestamp);
    
  // First priority: Find streaming/processing messages (most active)
  const activeMessages = assistantMessages.filter((msg: any) => 
    msg.status === MessageStatus.STREAMING || 
    msg.status === MessageStatus.PROCESSING);
  
  if (activeMessages.length > 0) {
    return activeMessages[0].id;
  } 
  
  // Second priority: Any message in the current conversation
  if (update.conversation_id) {
    const conversationMessages = assistantMessages.filter((msg: any) => 
      msg.conversationId === update.conversation_id);
      
    if (conversationMessages.length > 0) {
      return conversationMessages[0].id;
    }
  }
  
  // Last resort: Most recent assistant message
  if (assistantMessages.length > 0) {
    return assistantMessages[0].id;
  }
  
  return null;
}