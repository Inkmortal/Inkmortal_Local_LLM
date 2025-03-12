import { useReducer, useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

// Chat state management
import { chatReducer, initialChatState, ChatState, ChatActionType } from '../reducers/chatReducer';
import { 
  Message, 
  Conversation, 
  MessageRole, 
  MessageStatus, 
  ContentUpdateMode,
  MessageUpdatePayload
} from '../types/message';

// Services
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle
} from '../../../services/chat/conversationService';
import { sendChatMessage } from '../../../services/chat/messageService';
import {
  initializeWebSocket,
  registerMessageHandler,
  registerGlobalMessageHandler,
  addConnectionListener,
  isWebSocketConnected,
  closeWebSocket,
  waitForWebSocketConnection
} from '../../../services/chat/websocketService';

// Utils
import { showError, showInfo, showSuccess } from '../../../utils/notifications';

export interface UseChatOptions {
  initialConversationId?: string | null;
  autoConnect?: boolean;
}

export interface UseChatReturn {
  // State
  state: ChatState;
  
  // Conversation management
  loadConversations: () => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  startNewConversation: () => void;
  deleteCurrentConversation: () => Promise<void>;
  updateConversationTitle: (title: string) => Promise<void>;
  
  // Message management
  sendMessage: (content: string, file?: File | null) => Promise<void>;
  regenerateMessage: () => Promise<void>;
  regenerateLastMessage?: () => Promise<void>;
  stopGeneration: () => void;
  
  // WebSocket connection
  connectWebSocket: () => Promise<boolean>;
  
  // Derived data for components
  messages: Message[];
  sortedMessages?: Message[];
  conversationList?: Conversation[];
  activeConversation?: Conversation | null;
  isGenerating?: boolean;
  
  // File handling
  handleFileSelect?: (file: File) => void;
  clearSelectedFile?: () => void;
  selectedFile?: File | null;
  
  // Editor refs
  codeInsertRef?: React.RefObject<((code: string) => void) | undefined>;
  mathInsertRef?: React.RefObject<((formula: string) => void) | undefined>;
}

/**
 * Custom hook for chat functionality
 * Handles chat state, WebSocket connections, and message interaction
 */
export const useChat = ({ 
  initialConversationId = null,
  autoConnect = true
}: UseChatOptions = {}): UseChatReturn => {
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(chatReducer, {
    ...initialChatState,
    activeConversationId: initialConversationId
  });
  
  const isMounted = useRef(true);
  const wsConnectedRef = useRef(false);
  const tokenRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Setup effect: get token and connect
  useEffect(() => {
    // Get token from either token or authToken storage
    tokenRef.current = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    // Connect WebSocket if auto-connect is enabled
    if (autoConnect && tokenRef.current) {
      console.log('Auto-connecting WebSocket in useChat');
      connectWebSocket();
    }
    
    return () => {
      isMounted.current = false;
      
      // Clean up WebSocket connection - but only if we're unmounting the entire chat
      // Don't close connection when just switching between conversations
      if (!window.location.pathname.includes('/chat')) {
        console.log('Leaving chat area, closing WebSocket connection');
        closeWebSocket();
      } else {
        console.log('Staying in chat area, keeping WebSocket connection alive');
      }
      
      // Clean up any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoConnect]);
  
  // Load initial conversation if ID is provided
  useEffect(() => {
    if (initialConversationId && state.activeConversationId) {
      loadConversation(state.activeConversationId);
    }
  }, [initialConversationId]);
  
  // Connect WebSocket with improved reliability
  const connectWebSocket = useCallback(async (): Promise<boolean> => {
    const token = tokenRef.current;
    
    if (!token) {
      console.error("Cannot connect WebSocket - no authentication token");
      wsConnectedRef.current = false;
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: false 
      });
      return false;
    }
    
    try {
      console.log("Attempting to initialize WebSocket connection...");
      
      // Check if already connected first
      if (isWebSocketConnected()) {
        console.log("WebSocket already connected, no need to initialize");
        wsConnectedRef.current = true;
        dispatch({ 
          type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
          payload: true 
        });
        return true;
      }
      
      // Use the new waitForWebSocketConnection function with timeout
      const connected = await waitForWebSocketConnection(token, 5000);
      wsConnectedRef.current = connected;
      
      console.log(`WebSocket initialization result: ${connected ? 'SUCCESS' : 'FAILED'}`);
      
      // Update UI state
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: connected 
      });
      
      if (connected) {
        // Setup connection listener for changes
        const unregisterListener = addConnectionListener((connected) => {
          wsConnectedRef.current = connected;
          console.log(`WebSocket connection state changed: ${connected ? 'connected' : 'disconnected'}`);
          
          // Update reducer state to trigger UI changes
          dispatch({ 
            type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
            payload: connected 
          });
        });
        
        // Register a global message handler for messages without IDs (like from Ollama)
        const unregisterGlobalHandler = registerGlobalMessageHandler((update) => {
          console.log('Global message handler received update:', update);
          
          // Try to find the most recent assistant message to update
          // First look for messages with in-progress statuses 
          // Include ALL possible statuses to make sure we don't miss any messages
          const assistantMessages = Object.values(state.messages)
            .filter(msg => msg.role === MessageRole.ASSISTANT)
            .sort((a, b) => b.timestamp - a.timestamp);
          
          let messageToUpdate = null;
          
          if (assistantMessages.length > 0) {
            // Found an in-progress message to update
            messageToUpdate = assistantMessages[0];
            console.log(`Found active assistant message to update: ${messageToUpdate.id}`);
          } else if (update.conversation_id) {
            // If no in-progress message, try to find any assistant message in this conversation
            const conversationMessages = Object.values(state.messages)
              .filter(msg => 
                msg.role === MessageRole.ASSISTANT && 
                msg.conversationId === update.conversation_id
              )
              .sort((a, b) => b.timestamp - a.timestamp);
              
            if (conversationMessages.length > 0) {
              messageToUpdate = conversationMessages[0];
              console.log(`Found assistant message in conversation to update: ${messageToUpdate.id}`);
            }
          } else {
            // Last resort: just use the most recent assistant message
            const anyAssistantMessages = Object.values(state.messages)
              .filter(msg => msg.role === MessageRole.ASSISTANT)
              .sort((a, b) => b.timestamp - a.timestamp);
              
            if (anyAssistantMessages.length > 0) {
              messageToUpdate = anyAssistantMessages[0];
              console.log(`Using most recent assistant message as fallback: ${messageToUpdate.id}`);
            }
          }
          
          // Update the message if we found one
          if (messageToUpdate && update.assistant_content !== undefined) {
            const content = typeof update.assistant_content === 'string' 
              ? update.assistant_content 
              : String(update.assistant_content);
            
            // Determine if message is complete
            const isComplete = update.is_complete === true || 
                             update.done === true || 
                             update.status === 'COMPLETE' ||
                             update.status === MessageStatus.COMPLETE;
            
            // Update the message status first to ensure it's visible
            if (messageToUpdate.status === MessageStatus.PENDING) {
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: messageToUpdate.id,
                  status: MessageStatus.STREAMING
                }
              });
            }
            
            // Update message content
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: messageToUpdate.id,
                content: content,
                contentUpdateMode: ContentUpdateMode.APPEND,
                status: isComplete ? MessageStatus.COMPLETE : MessageStatus.STREAMING,
                isComplete: isComplete
              }
            });
          } else {
            console.warn('Received global message update but no assistant message found', update);
          }
        });
        
        console.log("WebSocket connection listeners and handlers registered");
      } else {
        console.warn("WebSocket connection failed or timed out");
      }
      
      return wsConnectedRef.current;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      wsConnectedRef.current = false;
      
      // Update UI state
      dispatch({ 
        type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
        payload: false 
      });
      
      return false;
    }
  }, [state.messages]); // Depend on messages to find latest for global handler
  
  // Load all conversations for the current user
  const loadConversations = useCallback(async () => {
    if (state.isLoadingConversations) return;
    
    try {
      dispatch({ type: ChatActionType.SET_LOADING_CONVERSATIONS, payload: true });
      
      const conversationsData = await listConversations();
      
      if (isMounted.current) {
        // The API returns {conversations: [...]} but we need the array
        const conversationsArray = conversationsData?.conversations || [];
        
        // Map API response to our Conversation type
        const conversations: Conversation[] = conversationsArray.map(convRaw => ({
          id: convRaw.id,
          title: convRaw.title || 'Untitled',
          createdAt: new Date(convRaw.created_at).getTime(),
          updatedAt: new Date(convRaw.updated_at).getTime()
        }));
        
        dispatch({ type: ChatActionType.SET_CONVERSATIONS, payload: conversations });
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      
      if (isMounted.current) {
        dispatch({ 
          type: ChatActionType.SET_ERROR, 
          payload: new Error('Failed to load conversations')
        });
        showError('Failed to load conversations');
      }
    } finally {
      if (isMounted.current) {
        dispatch({ type: ChatActionType.SET_LOADING_CONVERSATIONS, payload: false });
      }
    }
  }, [state.isLoadingConversations]);
  
  // Load a specific conversation by ID
  const loadConversation = useCallback(async (conversationId: string) => {
    if (state.isLoadingMessages || !conversationId) return;
    
    // Set active conversation ID first for a more responsive UI
    dispatch({ type: ChatActionType.SET_ACTIVE_CONVERSATION, payload: conversationId });
    dispatch({ type: ChatActionType.SET_LOADING_MESSAGES, payload: true });
    
    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      // Update URL to reflect the current conversation
      navigate(`/chat/${conversationId}`);
      
      // Fetch conversation data
      const conversationData = await getConversation(conversationId);
      
      // The backend returns the conversation data directly, not nested in a 'conversation' property
      // Create conversation object
      const conversation: Conversation = {
        id: conversationId,
        title: conversationData.title || 'Untitled',
        createdAt: new Date(conversationData.created_at).getTime(),
        updatedAt: new Date(conversationData.updated_at).getTime()
      };
      
      dispatch({ type: ChatActionType.ADD_CONVERSATION, payload: conversation });
      
      // Map API message format to our Message format
      const messages: Message[] = conversationData.messages.map(msg => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        role: msg.role as MessageRole,
        content: msg.content,
        status: MessageStatus.COMPLETE,
        timestamp: new Date(msg.created_at).getTime()
      }));
      
      dispatch({ type: ChatActionType.SET_MESSAGES, payload: messages });
    } catch (error) {
      console.error('Error loading conversation:', error);
      
      if (isMounted.current) {
        dispatch({ type: ChatActionType.SET_MESSAGES, payload: [] });
        dispatch({ 
          type: ChatActionType.SET_ERROR, 
          payload: new Error('Failed to load conversation')
        });
        showError('Failed to load conversation');
      }
    } finally {
      if (isMounted.current) {
        dispatch({ type: ChatActionType.SET_LOADING_MESSAGES, payload: false });
        abortControllerRef.current = null;
      }
    }
  }, [state.activeConversationId, state.isLoadingMessages, navigate]);
  
  // Start a new conversation
  const startNewConversation = useCallback(() => {
    // Clear messages and active conversation ID
    dispatch({ type: ChatActionType.SET_MESSAGES, payload: [] });
    dispatch({ type: ChatActionType.SET_ACTIVE_CONVERSATION, payload: null });
    
    // Navigate to base chat URL to reflect new conversation
    navigate('/chat');
  }, [navigate]);
  
  // Delete the current conversation
  const deleteCurrentConversation = useCallback(async () => {
    if (!state.activeConversationId) return;
    
    try {
      const result = await deleteConversation(state.activeConversationId);
      
      if (result.success) {
        // Update UI
        showSuccess('Conversation deleted');
        
        // Reload conversations list and clear current conversation
        await loadConversations();
        startNewConversation();
      } else {
        showError(`Failed to delete conversation: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showError('Failed to delete conversation');
    }
  }, [state.activeConversationId, loadConversations, startNewConversation]);
  
  // Update the title of the current conversation
  const updateCurrentConversationTitle = useCallback(async (title: string) => {
    if (!state.activeConversationId || !title.trim()) return;
    
    try {
      const result = await updateConversationTitle(state.activeConversationId, title);
      
      if (result.success) {
        // Update conversations list to reflect new title
        await loadConversations();
      } else {
        showError(`Failed to update title: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
      showError('Failed to update conversation title');
    }
  }, [state.activeConversationId, loadConversations]);
  
  // Send a message in the current conversation
  const sendMessage = useCallback(async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) return;
    
    // Check if any message is currently being generated - using more careful checking
    const generatingMessages = Object.values(state.messages).filter(msg => 
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
      const stuckMessages = generatingMessages.filter(msg => {
        const messageAge = timeNow - msg.timestamp;
        // Consider messages older than 2 minutes as stuck
        return messageAge > 120000;
      });
      
      if (stuckMessages.length > 0) {
        console.log(`Found ${stuckMessages.length} stuck messages, resetting their state to allow new messages`);
        
        // Force reset stuck messages to complete status
        stuckMessages.forEach(msg => {
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
        wsConnectedRef.current = true;
        dispatch({ 
          type: ChatActionType.SET_WEBSOCKET_CONNECTED, 
          payload: true 
        });
      } else {
        console.warn('Failed to establish WebSocket connection before sending message, will use polling fallback');
        useWebSocket = false;
        wsConnectedRef.current = false;
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
    
    try {
      // Check if we need to create a new conversation first
      let conversationId = state.activeConversationId;
      if (!conversationId) {
        try {
          showInfo('Creating new conversation...');
          const newConversation = await createConversation();
          
          if (!newConversation || !newConversation.conversation_id) {
            throw new Error('Failed to create conversation');
          }
          
          conversationId = newConversation.conversation_id;
          
          // Update the conversation ID in state
          dispatch({ type: ChatActionType.SET_ACTIVE_CONVERSATION, payload: conversationId });
          
          // Also update message conversation IDs
          dispatch({
            type: ChatActionType.UPDATE_MESSAGE,
            payload: {
              messageId,
              metadata: { conversationId }
            }
          });
          
          dispatch({
            type: ChatActionType.UPDATE_MESSAGE,
            payload: {
              messageId: assistantMessageId,
              metadata: { conversationId }
            }
          });
          
          // Update URL to include new conversation ID
          navigate(`/chat/${conversationId}`);
          
          // Add new conversation to state (temporary, will be replaced on reload)
          dispatch({
            type: ChatActionType.ADD_CONVERSATION,
            payload: {
              id: conversationId,
              title: 'New conversation',
              createdAt: now,
              updatedAt: now
            }
          });
        } catch (error) {
          console.error('Error creating conversation:', error);
          throw new Error('Failed to create a new conversation');
        }
      }
      
      // Update user message to show it's been sent
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId,
          status: MessageStatus.COMPLETE
        }
      });
      
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
      let globalUnregisterHandler: (() => void) | null = null;
      
      // Verify WebSocket state before registering handlers
      const actuallyConnected = isWebSocketConnected();
      
      if (actuallyConnected) {
        console.log(`WebSocket is connected, registering message handlers for ${assistantMessageId}`);
        console.log(`Assistant message is in state:`, state.messages[assistantMessageId]);
        
        // Register specific message ID handler
        messageUnregisterHandler = registerMessageHandler(assistantMessageId, (update) => {
          console.log(`Message-specific WebSocket update for ${assistantMessageId}:`, update);
          console.log(`State contains these message IDs:`, Object.keys(state.messages));
          console.log(`Message being updated exists in state: ${!!state.messages[assistantMessageId]}`);
          handleWebSocketUpdate(update, assistantMessageId);
        });
        
        // Also register a global handler that will be triggered for model responses that don't include message ID
        // (like those from Ollama). This handler will only update the most recent assistant message.
        globalUnregisterHandler = registerGlobalMessageHandler((update) => {
          console.log(`Global message handler received update:`, update);
          console.log(`Current state has these IDs:`, Object.keys(state.messages));
          
          // Check for a message ID match first (backend might be sending our ID back)
          if (update.message_id && state.messages[update.message_id]) {
            console.log(`Found direct message ID match for ${update.message_id}`);
            handleWebSocketUpdate(update, update.message_id);
            return;
          }
          
          // If the message references the current assistant message ID, use it directly
          if (assistantMessageId && state.messages[assistantMessageId]) {
            console.log(`Using current assistant message ID ${assistantMessageId} for update`);
            handleWebSocketUpdate(update, assistantMessageId);
            return;
          }
          
          // For global updates, we need to verify this is actually for the current message
          // by checking the timestamps to find the most recent assistant message
          const assistantMessages = Object.values(state.messages)
            .filter(msg => msg.role === MessageRole.ASSISTANT && 
                 (msg.status === MessageStatus.STREAMING || 
                  msg.status === MessageStatus.PROCESSING ||
                  msg.status === MessageStatus.QUEUED ||
                  msg.status === MessageStatus.PENDING))
            .sort((a, b) => b.timestamp - a.timestamp);
          
          if (assistantMessages.length > 0) {
            // Use the most recent in-progress assistant message
            const mostRecentMessage = assistantMessages[0];
            console.log(`Global WebSocket update routed to message ${mostRecentMessage.id}`);
            handleWebSocketUpdate(update, mostRecentMessage.id);
          } else {
            // If we didn't find any in-progress messages, this might be the first response
            // Find any assistant message in the current conversation, even if completed
            const anyAssistantMessages = Object.values(state.messages)
              .filter(msg => msg.role === MessageRole.ASSISTANT && 
                     msg.conversationId === update.conversation_id)
              .sort((a, b) => b.timestamp - a.timestamp);
              
            if (anyAssistantMessages.length > 0) {
              const mostRecentMessage = anyAssistantMessages[0];
              console.log(`Using fallback: routing WebSocket update to message ${mostRecentMessage.id}`);
              handleWebSocketUpdate(update, mostRecentMessage.id);
            } else {
              console.log("No assistant message found for global update - using reducer to create it:", update);
              
              // Create a temporary message ID if none exists
              const tempMessageId = update.message_id || uuidv4();
              
              // Let the reducer handle creating the message - just pass the update directly
              handleWebSocketUpdate(update, tempMessageId);
            }
          }
        });
      } else {
        console.warn('WebSocket not connected, message updates will be handled via polling');
      }
      
      // Helper function to process WebSocket updates for a specific message
      const handleWebSocketUpdate = (update: any, targetMessageId: string) => {
        // STEP 1: Handle message status updates
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
          
          // Update message status - include conversation ID for possible message creation
          dispatch({
            type: ChatActionType.UPDATE_MESSAGE,
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
        
        // STEP 2: Handle content updates
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
            
            // Set update mode based on content_update_type (default to APPEND)
            const updateMode = update.content_update_type !== "REPLACE" 
              ? ContentUpdateMode.APPEND 
              : ContentUpdateMode.REPLACE;
              
            // Log message updates but rely on the reducer to handle missing messages
            const existingMessage = state.messages[targetMessageId];
            if (!existingMessage) {
              console.log(`Update for message ${targetMessageId} not in state yet - reducer will create it`);
            } else {
              console.log(`Updating message ${targetMessageId} - current content length: ${existingMessage.content.length}, adding token length: ${content.length}`);
            }
            
            // If we have a section field, use section-specific update
            if (update.section) {
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: targetMessageId,
                  content: content,
                  section: update.section,
                  contentUpdateMode: updateMode,
                  metadata: {
                    conversationId: update.conversation_id,  // Include for message creation
                    model: update.model  // Pass model info if available
                  }
                }
              });
            } else {
              // No section specified, update main content
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: targetMessageId,
                  content: content,
                  contentUpdateMode: updateMode,
                  metadata: {
                    conversationId: update.conversation_id,  // Include for message creation
                    model: update.model  // Pass model info if available
                  }
                }
              });
            }
            
            // Set status to STREAMING while receiving content
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: targetMessageId,
                status: MessageStatus.STREAMING,
                metadata: {
                  conversationId: update.conversation_id  // Include for message creation
                }
              }
            });
          }
          
          // Store model info in metadata if available
          if (update.model) {
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: targetMessageId,
                metadata: { model: update.model }
              }
            });
          }
        }
        
        // STEP 3: Handle completion from various formats
        const isComplete = 
          update.is_complete === true || 
          update.done === true || 
          update.status === "COMPLETE" ||
          update.status === "complete" ||
          update.status === MessageStatus.COMPLETE;
        
        if (isComplete) {
          dispatch({
            type: ChatActionType.UPDATE_MESSAGE,
            payload: {
              messageId: targetMessageId,
              status: MessageStatus.COMPLETE,
              isComplete: true,
              metadata: {
                conversationId: update.conversation_id,  // Include for message creation
                model: update.model
              }
            }
          });
        }
      };
      
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
        if (messageUnregisterHandler || globalUnregisterHandler) {
          setTimeout(() => {
            console.log('Cleaning up message handlers after timeout');
            if (messageUnregisterHandler) {
              messageUnregisterHandler();
            }
            if (globalUnregisterHandler) {
              globalUnregisterHandler();
            }
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
  }, [
    state.messages, 
    state.activeConversationId, 
    navigate
  ]);
  
  // Regenerate the last message
  const regenerateMessage = useCallback(async () => {
    // Find the last user message
    const userMessages = Object.values(state.messages)
      .filter(msg => msg.role === MessageRole.USER)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (userMessages.length === 0) {
      showError('No user message to regenerate');
      return;
    }
    
    // Get the most recent user message
    const lastUserMessage = userMessages[0];
    
    // Send it again to regenerate the response
    await sendMessage(lastUserMessage.content);
  }, [state.messages, sendMessage]);
  
  // Stop message generation
  const stopGeneration = useCallback(() => {
    // Find all messages with streaming status
    const streamingMessages = Object.values(state.messages).filter(msg => 
      msg.status === MessageStatus.STREAMING || 
      msg.status === MessageStatus.PROCESSING
    );
    
    // Mark all as complete to stop the streaming UI indicators
    streamingMessages.forEach(msg => {
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
  }, [state.messages]);
  
  // Convert dictionary-based messages to sorted array for components
  const messages = useMemo(() => {
    return Object.values(state.messages).sort((a, b) => a.timestamp - b.timestamp);
  }, [state.messages]);
  
  // Get current active conversation details
  const activeConversation = useMemo(() => {
    return state.activeConversationId ? state.conversations[state.activeConversationId] : null;
  }, [state.activeConversationId, state.conversations]);
  
  // Convert conversations dictionary to array
  const conversationList = useMemo(() => {
    return Object.values(state.conversations).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state.conversations]);
  
  // Alias for regenerateMessage to match expected interface
  const regenerateLastMessage = useCallback(() => {
    regenerateMessage();
  }, [regenerateMessage]);
  
  // File handling state and helpers
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);
  
  const clearSelectedFile = useCallback(() => {
    setSelectedFile(null);
  }, []);
  
  // Editor refs for code and math input
  const codeInsertRef = useRef<((code: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((formula: string) => void) | undefined>(undefined);
  
  // Flag for indicating if message generation is in progress
  const isGenerating = useMemo(() => {
    return Object.values(state.messages).some(msg => 
      msg.status === MessageStatus.STREAMING || 
      msg.status === MessageStatus.PROCESSING || 
      msg.status === MessageStatus.QUEUED
    );
  }, [state.messages]);

  return {
    state,
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteCurrentConversation,
    updateConversationTitle: updateCurrentConversationTitle,
    sendMessage,
    regenerateMessage,
    regenerateLastMessage, // Alias for expected interface
    stopGeneration,
    connectWebSocket,
    
    // Add derived data for components
    messages,
    sortedMessages: messages, // Alias to match expected interface
    conversationList,
    activeConversation,
    isGenerating,
    
    // File handling implementation
    handleFileSelect,
    clearSelectedFile,
    selectedFile,
    
    // Editor refs for code and math
    codeInsertRef,
    mathInsertRef
  };
};

// WebSocket is now managed directly within the useChat hook for better integration