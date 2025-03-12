import { useReducer, useEffect, useCallback, useRef } from 'react';
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
  addConnectionListener,
  isWebSocketConnected,
  closeWebSocket
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
  stopGeneration: () => void;
  
  // WebSocket connection
  connectWebSocket: () => Promise<boolean>;
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
    tokenRef.current = localStorage.getItem('token');
    
    // Connect WebSocket if auto-connect is enabled
    if (autoConnect && tokenRef.current) {
      connectWebSocket();
    }
    
    return () => {
      isMounted.current = false;
      
      // Clean up WebSocket connection
      closeWebSocket();
      
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
  
  // Connect WebSocket
  const connectWebSocket = useCallback(async (): Promise<boolean> => {
    const token = tokenRef.current;
    
    if (!token) {
      wsConnectedRef.current = false;
      return false;
    }
    
    try {
      wsConnectedRef.current = await initializeWebSocket(token);
      
      if (wsConnectedRef.current) {
        // Setup connection listener
        addConnectionListener((connected) => {
          wsConnectedRef.current = connected;
          console.log(`WebSocket connection state changed: ${connected ? 'connected' : 'disconnected'}`);
        });
      }
      
      return wsConnectedRef.current;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      wsConnectedRef.current = false;
      return false;
    }
  }, []);
  
  // Load all conversations for the current user
  const loadConversations = useCallback(async () => {
    if (state.isLoadingConversations) return;
    
    try {
      dispatch({ type: ChatActionType.SET_LOADING_CONVERSATIONS, payload: true });
      
      const conversationsData = await listConversations();
      
      if (isMounted.current) {
        // Map API response to our Conversation type
        const conversations: Conversation[] = conversationsData.map(convRaw => ({
          id: convRaw.conversation_id || convRaw.id,
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
      const conversationRaw = conversationData.conversation;
      
      // Create conversation object
      const conversation: Conversation = {
        id: conversationId,
        title: conversationRaw.title || 'Untitled',
        createdAt: new Date(conversationRaw.created_at).getTime(),
        updatedAt: new Date(conversationRaw.updated_at).getTime()
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
    
    // If our reference says connected but actual state is disconnected, force reconnect
    if (wsConnectedRef.current && !useWebSocket) {
      console.log('WebSocket reference shows connected but actual state is disconnected - forcing reconnection');
    }
    
    // Initialize WebSocket if needed
    const needsWebSocketConnection = !useWebSocket;
    if (needsWebSocketConnection && tokenRef.current) {
      console.log('No WebSocket connection detected, attempting to connect before sending message');
      const connected = await initializeWebSocketConnection();
      console.log(`WebSocket connection attempt result: ${connected ? "SUCCESS" : "FAILED"}`);
      
      // Update our connection status after the attempt
      useWebSocket = isWebSocketConnected();
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
      status: MessageStatus.PENDING,
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
      let unregisterHandler: (() => void) | null = null;
      
      // CRITICAL: Verify WebSocket state before registering handler
      const actuallyConnected = isWebSocketConnected();
      
      if (actuallyConnected) {
        console.log(`Registering WebSocket handler for message ${assistantMessageId} (WebSocket is connected)`);
        unregisterHandler = registerMessageHandler(assistantMessageId, (update) => {
          // Simple debug log to monitor WebSocket updates
          console.log(`WebSocket update for ${assistantMessageId}:`, update);
          
          // STEP 1: Handle message status updates
          if (update.status) {
            // Map status string directly to our enum values
            const messageStatus = 
              update.status === "PROCESSING" ? MessageStatus.PROCESSING :
              update.status === "STREAMING" ? MessageStatus.STREAMING :
              update.status === "COMPLETE" ? MessageStatus.COMPLETE :
              update.status === "ERROR" ? MessageStatus.ERROR :
              update.status === "QUEUED" ? MessageStatus.QUEUED :
              MessageStatus.PENDING;
            
            // Update message status
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: assistantMessageId,
                status: messageStatus,
                metadata: update.error ? { error: update.error } : undefined
              }
            });
            
            // Log streaming detection
            if (update.status === "STREAMING") {
              console.log("STREAMING mode detected from backend");
            }
          }
          
          // STEP 2: Handle content updates with our standard section-based format
          if (update.assistant_content !== undefined) {
            // Make sure content is a string
            const content = typeof update.assistant_content === 'string' 
              ? update.assistant_content 
              : String(update.assistant_content);
            
            console.log(`Received content: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
            
            // Set update mode based on content_update_type (default to APPEND)
            const updateMode = update.content_update_type !== "REPLACE" 
              ? ContentUpdateMode.APPEND 
              : ContentUpdateMode.REPLACE;
            
            // If we have a section field, use section-specific update
            if (update.section) {
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: assistantMessageId,
                  content: content,
                  section: update.section,
                  contentUpdateMode: updateMode
                }
              });
            } else {
              // No section specified, update main content
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: assistantMessageId,
                  content: content,
                  contentUpdateMode: updateMode
                }
              });
            }
            
            // Always ensure status is set to STREAMING when we get content
            // during streaming (this ensures UI shows streaming indicators)
            if (update.status === "STREAMING") {
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: assistantMessageId,
                  status: MessageStatus.STREAMING
                }
              });
            }
          }
          
          // STEP 3: Handle completion
          if (update.is_complete) {
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: assistantMessageId,
                status: MessageStatus.COMPLETE,
                isComplete: true
              }
            });
          }
        });
      }
      
      try {
        // Send the message to the server
        const result = await sendChatMessage(content, conversationId, fileData);
        
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        
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
        // Clean up WebSocket handler when done with this request
        if (unregisterHandler) {
          setTimeout(() => {
            unregisterHandler?.();
          }, 10000); // Wait 10 seconds before unregistering to ensure we get all updates
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
  
  return {
    state,
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteCurrentConversation,
    updateConversationTitle: updateCurrentConversationTitle,
    sendMessage,
    regenerateMessage,
    stopGeneration,
    connectWebSocket
  };
};

// Initialize WebSocket connection helper
async function initializeWebSocketConnection(): Promise<boolean> {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    return await initializeWebSocket(token);
  } catch (error) {
    console.error('Error initializing WebSocket connection:', error);
    return false;
  }
}