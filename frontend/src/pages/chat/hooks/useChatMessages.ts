/**
 * Chat message management hook
 * 
 * Handles sending, regenerating, and streaming messages
 */
import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { 
  Message, 
  MessageRole, 
  MessageStatus, 
  ContentUpdateMode 
} from '../types/message';
import { ChatActionType } from '../reducers/chatReducer';
import { createConversation } from '../../../services/chat/conversationService';
import { sendChatMessage } from '../../../services/chat/messageService';
import { 
  registerMessageHandler,
  isWebSocketConnected,
  waitForWebSocketConnection
} from '../../../services/chat/websocketService';
import { showError, showInfo } from '../../../utils/notifications';
import { handleWebSocketUpdate } from './useChatUtils';

/**
 * Hook for chat message handling
 * 
 * @param state Current chat state
 * @param dispatch Reducer dispatch function
 * @param isMounted Reference to component mount state
 * @param tokenRef Reference to auth token
 * @returns Message management functions
 */
export function useChatMessages(
  state: any,
  dispatch: React.Dispatch<any>,
  isMounted: React.MutableRefObject<boolean>,
  tokenRef: React.MutableRefObject<string | null>
) {
  const navigate = useNavigate();
  
  // Refs for debouncing WebSocket updates
  const contentBufferRef = useRef<Record<string, string>>({});
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  // Ref for message status update timeouts
  const messageTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  /**
   * Handler for WebSocket message updates
   */
  const handleWebSocketMessage = useCallback((update: any, targetMessageId: string | null) => {
    // Handle WebSocket updates for specific message ID
    // If no target message ID is provided, try to find a matching one
    if (!targetMessageId) {
      // Try to find the target message by ID or most recent assistant message
      const messageId = update.message_id || null;
      
      // First try to find by exact message ID if provided
      let messageToUpdate = messageId ? state.messages[messageId] : null;
      
      // If no exact match found, use smarter lookup
      if (!messageToUpdate) {
        // Find all assistant messages in order of recency
        const assistantMessages = Object.values(state.messages)
          .filter((msg: any) => msg.role === MessageRole.ASSISTANT)
          .sort((a: any, b: any) => b.timestamp - a.timestamp);
          
        // First priority: Find streaming/processing messages (most active)
        const activeMessages = assistantMessages.filter((msg: any) => 
          msg.status === MessageStatus.STREAMING || 
          msg.status === MessageStatus.PROCESSING);
        
        if (activeMessages.length > 0) {
          messageToUpdate = activeMessages[0];
          console.log(`Found active streaming message to update: ${messageToUpdate.id}`);
        } 
        // Second priority: Any message in the current conversation
        else if (update.conversation_id) {
          const conversationMessages = assistantMessages.filter((msg: any) => 
            msg.conversationId === update.conversation_id);
            
          if (conversationMessages.length > 0) {
            messageToUpdate = conversationMessages[0];
            console.log(`Found message in conversation to update: ${messageToUpdate.id}`);
          }
        }
        // Last resort: Most recent assistant message
        else if (assistantMessages.length > 0) {
          messageToUpdate = assistantMessages[0];
          console.log(`Using most recent assistant message: ${messageToUpdate.id}`);
        }
      } else {
        console.log(`Found exact message match with ID: ${messageId}`);
      }
      
      // Update the message if we found one
      if (messageToUpdate && update.assistant_content !== undefined) {
        targetMessageId = messageToUpdate.id;
      } else {
        console.warn('Received message update but couldn\'t find target message', update);
        return;
      }
    }
    
    // Process the update using the utility function
    handleWebSocketUpdate(
      update, 
      targetMessageId, 
      state, 
      dispatch, 
      contentBufferRef, 
      debounceTimersRef
    );
  }, [state, dispatch]);
  
  /**
   * Send a message in the current conversation
   */
  const sendMessage = useCallback(async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) return;
    
    // Check if any message is currently being generated - using more careful checking
    const generatingMessages = Object.values(state.messages).filter((msg: any) => 
      msg.status === MessageStatus.STREAMING || 
      msg.status === MessageStatus.PROCESSING || 
      msg.status === MessageStatus.QUEUED
    );
    
    const currentlyGenerating = generatingMessages.length > 0;
    
    // Log more details for debugging
    if (currentlyGenerating) {
      console.log(`Message sending blocked: AI is currently generating a response. Found ${generatingMessages.length} generating messages.`);
      console.log('Messages in generating state:', generatingMessages);
      
      // Force reset any messages that are stuck in generating state for too long
      // This prevents the UI from being permanently blocked
      const timeNow = Date.now();
      const stuckMessages = generatingMessages.filter((msg: any) => {
        const messageAge = timeNow - msg.timestamp;
        // Consider messages older than 2 minutes as stuck
        return messageAge > 120000;
      });
      
      if (stuckMessages.length > 0) {
        console.log(`Found ${stuckMessages.length} stuck messages, resetting their state to allow new messages`);
        
        // Force reset stuck messages to complete status
        stuckMessages.forEach((msg: any) => {
          dispatch({
            type: ChatActionType.UPDATE_MESSAGE,
            payload: {
              messageId: msg.id,
              status: MessageStatus.COMPLETE,
              isComplete: true,
              metadata: { error: "Message timed out", forced: true }
            }
          });
        });
        
        // Now we can proceed with the new message
      } else {
        // Still block if no stuck messages found
        return;
      }
    }
    
    // CRITICAL: Check WebSocket connection and verify its actual state
    let useWebSocket = isWebSocketConnected();
    
    // If we need a WebSocket connection and we have a token, make sure it's established
    if (!useWebSocket && tokenRef.current) {
      console.log('No WebSocket connection detected, attempting to connect before sending message');
      
      // Use waitForWebSocketConnection with a short timeout to avoid hanging the UI
      const connected = await waitForWebSocketConnection(tokenRef.current, 3000);
      console.log(`WebSocket connection attempt result: ${connected ? "SUCCESS" : "FAILED"}`);
      
      if (connected) {
        useWebSocket = true;
        dispatch({ 
          type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
          payload: true 
        });
      } else {
        console.warn('Failed to establish WebSocket connection before sending message, will use polling fallback');
        useWebSocket = false;
        dispatch({ 
          type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
          payload: false 
        });
      }
    }
    
    // Temporary IDs for immediate UI feedback
    const messageId = uuidv4();
    const assistantMessageId = uuidv4();
    const now = Date.now();
    
    // Create user message
    const userMessage: Message = {
      id: messageId,
      conversationId: state.activeConversationId || 'temp-id',
      role: MessageRole.USER,
      content,
      status: MessageStatus.SENDING,
      timestamp: now
    };
    
    // Create placeholder for assistant response
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversationId: state.activeConversationId || 'temp-id',
      role: MessageRole.ASSISTANT,
      content: '',
      status: MessageStatus.STREAMING, // Changed from PENDING to STREAMING for immediate visibility
      timestamp: now,
      // Initialize empty sections to ensure consistent UI structure
      sections: {
        response: {
          content: '',
          visible: true
        },
        thinking: {
          content: '',
          visible: true
        }
      }
    };
    
    // Add messages to state for immediate feedback
    dispatch({ type: ChatActionType.ADD_MESSAGE, payload: userMessage });
    dispatch({ type: ChatActionType.ADD_MESSAGE, payload: assistantMessage });
    
    // CRITICAL: Log the assistant message ID we're expecting updates for
    console.log(`IMPORTANT: Added assistant message ${assistantMessage.id} to state - EXPECT all WebSocket updates to use this ID`);
    
    try {
      // CRITICAL: Handle conversation creation if needed
      let conversationId = state.activeConversationId;
      
      // Check if we need to create a new conversation
      if (!conversationId) {
        try {
          console.log('[useChat] No active conversation ID, creating new conversation');
          showInfo('Creating new conversation...');
          
          // Create new conversation with proper error handling
          const newConversation = await createConversation();
          
          // Verify we have a valid response with conversation_id
          if (!newConversation) {
            throw new Error('createConversation returned null or undefined');
          }
          
          if (!newConversation.conversation_id) {
            throw new Error('createConversation response missing conversation_id');
          }
          
          conversationId = newConversation.conversation_id;
          console.log(`[useChat] Created new conversation with ID: ${conversationId}`);
          
          // Update conversation ID in state immediately
          dispatch({ type: ChatActionType.SET_ACTIVE_CONVERSATION, payload: conversationId });
          
          // Update URL to include new conversation ID
          navigate(`/chat/${conversationId}`);
          
          // Add conversation to state for immediate UI feedback
          const creationTime = now;
          dispatch({
            type: ChatActionType.ADD_CONVERSATION,
            payload: {
              id: conversationId,
              title: newConversation.title || 'New conversation',
              createdAt: creationTime,
              updatedAt: creationTime
            }
          });
          
          // CRITICAL: Update both message IDs simultaneously with detailed logging
          console.log(`[useChat] Updating message IDs for new conversation: user=${messageId}, assistant=${assistantMessageId}`);
          
          // Update user message conversation ID
          dispatch({
            type: ChatActionType.UPDATE_MESSAGE,
            payload: {
              messageId,
              metadata: { 
                conversationId,
                updated: Date.now() // Add timestamp for debugging
              }
            }
          });
          
          // Update assistant message conversation ID
          dispatch({
            type: ChatActionType.UPDATE_MESSAGE,
            payload: {
              messageId: assistantMessageId,
              metadata: { 
                conversationId,
                updated: Date.now() // Add timestamp for debugging
              }
            }
          });
          
        } catch (error) {
          console.error('[useChat] Error creating conversation:', error);
          showError(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw new Error('Failed to create a new conversation');
        }
      } else {
        console.log(`[useChat] Using existing conversation ID: ${conversationId}`);
      }
      
      // Update user message to show it's been sent
      // Use a guaranteed approach to update user message status
      setTimeout(() => {
        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId,
            status: MessageStatus.COMPLETE
          }
        });
        console.log(`[useChatMessages] Updated user message ${messageId} status to COMPLETE`);
      }, 0);
      
      // Also set a safety timeout to ensure status is updated even if something else fails
      const safetyTimeout = setTimeout(() => {
        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId,
            status: MessageStatus.COMPLETE
          }
        });
        console.log(`[useChatMessages] SAFETY: Forced update of user message ${messageId} status to COMPLETE`);
      }, 1000);
      
      // Store timeout for cleanup
      messageTimeoutsRef.current[messageId] = safetyTimeout;
      
      // Check if file is provided
      let fileData = null;
      if (file) {
        const reader = new FileReader();
        const fileContent = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsText(file);
        });
        
        fileData = {
          filename: file.name,
          content: fileContent,
          size: file.size,
          type: file.type,
        };
      }
      
      // Register WebSocket handler for this message
      let messageUnregisterHandler: (() => void) | null = null;
      
      // Verify WebSocket state before registering handlers
      const actuallyConnected = isWebSocketConnected();
      
      if (actuallyConnected) {
        console.log(`WebSocket is connected, registering message handlers for ${assistantMessageId}`);
        
        // Register specific message ID handler
        messageUnregisterHandler = registerMessageHandler(assistantMessageId, (update) => {
          console.log(`Message-specific WebSocket update for ${assistantMessageId}:`, update);
          handleWebSocketMessage(update, assistantMessageId);
        });
      } else {
        console.warn('WebSocket not connected, message updates will be handled via polling');
      }
      
      try {
        // Add the assistant message ID to file object so it gets passed to backend
        const fileWithAssistantId = fileData ? {
          ...fileData,
          assistantMessageId: assistantMessageId // Pass assistant ID to backend
        } : null;
        
        // Send the message to the server with the assistant message ID directly
        const result = await sendChatMessage(content, conversationId, fileWithAssistantId, {}, assistantMessageId);
        
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        
        console.log(`Message sent with assistant ID: ${assistantMessageId}`);
        
        // Update the assistant message with the server-generated ID
        if (result.message_id) {
          dispatch({
            type: ChatActionType.UPDATE_MESSAGE,
            payload: {
              messageId: assistantMessageId,
              metadata: { serverMessageId: result.message_id }
            }
          });
        }
      } finally {
        // Clean up WebSocket handlers when done with this request
        if (messageUnregisterHandler) {
          setTimeout(() => {
            console.log('Cleaning up message handlers after timeout');
            messageUnregisterHandler?.();
          }, 15000); // Wait 15 seconds before unregistering to ensure we get all updates
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the assistant message to show the error
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: assistantMessageId,
          status: MessageStatus.ERROR,
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          isComplete: true
        }
      });
      
      showError('Failed to send message');
    }
  }, [state.messages, state.activeConversationId, navigate, dispatch, handleWebSocketMessage]);
  
  /**
   * Regenerate the last message
   */
  const regenerateMessage = useCallback(async () => {
    // Find the last user message
    const userMessages = Object.values(state.messages)
      .filter((msg: any) => msg.role === MessageRole.USER)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
    
    if (userMessages.length === 0) {
      showError('No user message to regenerate');
      return;
    }
    
    // Get the most recent user message
    const lastUserMessage = userMessages[0];
    
    // Send it again to regenerate the response
    await sendMessage(lastUserMessage.content);
  }, [state.messages, sendMessage]);
  
  /**
   * Stop message generation
   */
  const stopGeneration = useCallback(() => {
    // Find all messages with streaming status
    const streamingMessages = Object.values(state.messages).filter((msg: any) => 
      msg.status === MessageStatus.STREAMING || 
      msg.status === MessageStatus.PROCESSING
    );
    
    // Mark all as complete to stop the streaming UI indicators
    streamingMessages.forEach((msg: any) => {
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: msg.id,
          status: MessageStatus.COMPLETE,
          isComplete: true,
          metadata: { stopped: true }
        }
      });
    });
    
    // Note: The backend will continue processing but we won't show further updates
    console.log(`Stopped generation for ${streamingMessages.length} messages`);
  }, [state.messages, dispatch]);
  
  return {
    sendMessage,
    regenerateMessage,
    stopGeneration,
    contentBufferRef,
    debounceTimersRef,
    handleWebSocketMessage
  };
}