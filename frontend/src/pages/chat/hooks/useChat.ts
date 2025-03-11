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
  regenerateLastMessage: () => Promise<void>;
  stopGeneration: () => void;
  
  // WebSocket management
  isWebSocketConnected: boolean;
  
  // UI state helpers
  isGenerating: boolean;
  activeConversation: Conversation | null;
  sortedMessages: Message[];
  conversationList: Conversation[];
  
  // File handling
  handleFileSelect: (file: File) => void;
  clearSelectedFile: () => void;
  selectedFile: File | null;
}

/**
 * Custom hook for chat state management with WebSocket integration
 */
export function useChat({
  initialConversationId = null,
  autoConnect = true,
}: UseChatOptions = {}): UseChatReturn {
  // State management
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const navigate = useNavigate();
  
  // Refs for tracking state between renders
  const tokenRef = useRef<string | null>(null);
  const wsConnectedRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMounted = useRef(true);
  const selectedFileRef = useRef<File | null>(null);
  
  // Get token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    tokenRef.current = token;
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Close WebSocket connection
      closeWebSocket();
    };
  }, []);
  
  // Initialize WebSocket connection when token is available
  useEffect(() => {
    if (tokenRef.current && autoConnect) {
      initializeWebSocketConnection();
    }
  }, [autoConnect]);
  
  // Load initial conversation if ID provided
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId);
    }
    
    // Always load conversation list
    loadConversations();
  }, [initialConversationId]);
  
  // Helper to initialize WebSocket
  const initializeWebSocketConnection = useCallback(async () => {
    if (!tokenRef.current) {
      console.log('No token available for WebSocket connection');
      return false;
    }
    
    try {
      const connected = await initializeWebSocket(tokenRef.current);
      wsConnectedRef.current = connected;
      
      if (connected) {
        console.log('WebSocket connected successfully');
        
        // Setup connection listener to track connection state
        const unsubscribe = addConnectionListener((isConnected) => {
          wsConnectedRef.current = isConnected;
          
          // Handle reconnection events
          if (isConnected && state.activeConversationId) {
            // Refresh messages if reconnected during active conversation
            loadConversation(state.activeConversationId);
          }
        });
        
        // Cleanup listener on unmount
        return () => unsubscribe();
      } else {
        console.warn('WebSocket connection failed, falling back to polling');
        return false;
      }
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      return false;
    }
  }, [state.activeConversationId]);
  
  // Load all conversations
  const loadConversations = useCallback(async () => {
    if (!isMounted.current) return;
    
    dispatch({ type: ChatActionType.SET_LOADING_CONVERSATIONS, payload: true });
    
    try {
      let conversations = await listConversations();
      
      if (!isMounted.current) return;
      
      // Handle both array and object with conversations property
      if (conversations && typeof conversations === 'object' && 'conversations' in conversations) {
        conversations = conversations.conversations;
      }
      
      // Ensure we have an array to work with
      const conversationsArray = Array.isArray(conversations) ? conversations : [];
      
      dispatch({ 
        type: ChatActionType.SET_CONVERSATIONS, 
        payload: conversationsArray.map(conv => ({
          id: conv.conversation_id,
          title: conv.title || 'New conversation',
          createdAt: new Date(conv.created_at).getTime(),
          updatedAt: new Date(conv.updated_at).getTime()
        }))
      });
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
  }, []);
  
  // Load a specific conversation and its messages
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!isMounted.current) return;
    
    // Skip if already loading or same conversation
    if (state.isLoadingMessages && state.activeConversationId === conversationId) return;
    
    // Update active conversation immediately for UI feedback
    dispatch({ type: ChatActionType.SET_ACTIVE_CONVERSATION, payload: conversationId });
    dispatch({ type: ChatActionType.SET_LOADING_MESSAGES, payload: true });
    
    // Abort any previous loading request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const conversationData = await getConversation(conversationId);
      
      if (!isMounted.current) return;
      
      if (!conversationData) {
        // Conversation not found, show error and reset
        dispatch({ type: ChatActionType.SET_MESSAGES, payload: [] });
        showError('Conversation not found');
        navigate('/chat');
        return;
      }
      
      // Update conversation in state if needed
      // Handle both direct object and wrapped object formats from backend
      const conversationRaw = conversationData.conversation || conversationData;
      const conversation: Conversation = {
        id: conversationRaw.conversation_id,
        title: conversationRaw.title || 'New conversation',
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
    
    // Check WebSocket connection
    const needsWebSocketConnection = !wsConnectedRef.current;
    if (needsWebSocketConnection && tokenRef.current) {
      await initializeWebSocketConnection();
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
      if (wsConnectedRef.current) {
        unregisterHandler = registerMessageHandler(assistantMessageId, (update) => {
          console.log('WebSocket update for message:', update);
          
          // Handle status updates
          if (update.status) {
            // Normalize status to lowercase for case-insensitive matching
            const status = typeof update.status === 'string' ? update.status.toLowerCase() : '';
            
            // Map backend status to our MessageStatus enum with more flexible matching
            const messageStatus = 
              /queued|queue|waiting|wait/i.test(status) ? MessageStatus.QUEUED :
              /process|processing|thinking/i.test(status) ? MessageStatus.PROCESSING :
              /stream|streaming|generating/i.test(status) ? MessageStatus.STREAMING :
              /complete|completed|done|finish|finished/i.test(status) ? MessageStatus.COMPLETE :
              /error|fail|failed|exception/i.test(status) ? MessageStatus.ERROR :
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
          }
          
          // Handle content updates
          if (update.assistant_content) {
            // Check if the update contains section markers
            const hasThinking = update.assistant_content.includes('<think>');
            
            if (hasThinking) {
              // Extract thinking and response content
              const thinkingMatches = update.assistant_content.match(/<think>([\s\S]*?)<\/think>/g);
              let thinkingContent = '';
              let responseContent = update.assistant_content;
              
              if (thinkingMatches) {
                thinkingContent = thinkingMatches
                  .map(match => match.replace(/<think>|<\/think>/g, ''))
                  .join('\n');
                
                // Remove thinking sections from response content
                responseContent = update.assistant_content.replace(/<think>[\s\S]*?<\/think>/g, '');
              }
              
              // Update thinking section
              if (thinkingContent) {
                dispatch({
                  type: ChatActionType.UPDATE_MESSAGE,
                  payload: {
                    messageId: assistantMessageId,
                    content: thinkingContent,
                    section: 'thinking',
                    contentUpdateMode: ContentUpdateMode.REPLACE
                  }
                });
              }
              
              // Update response section
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: assistantMessageId,
                  content: responseContent,
                  section: 'response',
                  contentUpdateMode: ContentUpdateMode.REPLACE
                }
              });
            } else {
              // No sections, just update response content
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: assistantMessageId,
                  content: update.assistant_content,
                  section: 'response',
                  contentUpdateMode: ContentUpdateMode.REPLACE
                }
              });
            }
          }
          
          // Handle completion
          if (update.status === 'complete') {
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: assistantMessageId,
                status: MessageStatus.COMPLETE,
                isComplete: true
              }
            });
            
            // Clean up handler
            if (unregisterHandler) {
              unregisterHandler();
              unregisterHandler = null;
            }
            
            // Reload conversations to get updated titles
            loadConversations();
          }
          
          // Handle errors
          if (update.status === 'error') {
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: assistantMessageId,
                status: MessageStatus.ERROR,
                metadata: { error: update.error || 'Unknown error' }
              }
            });
            
            // Clean up handler
            if (unregisterHandler) {
              unregisterHandler();
              unregisterHandler = null;
            }
          }
        });
      }
      
      // Send the message
      await sendChatMessage(
        content, 
        conversationId!, 
        fileData, 
        {
          onStart: () => {
            if (!isMounted.current) {
              if (unregisterHandler) unregisterHandler();
              return;
            }
            
            // Update assistant message to show it's been queued
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: assistantMessageId,
                status: MessageStatus.QUEUED
              }
            });
          },
          onToken: (token) => {
            if (!isMounted.current) {
              if (unregisterHandler) unregisterHandler();
              return;
            }
            
            // Only use this for fallback if WebSocket fails
            if (!wsConnectedRef.current) {
              // Update status to streaming if needed
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: assistantMessageId,
                  status: MessageStatus.STREAMING
                }
              });
              
              // Check if token contains section markers
              if (token.includes('<think>')) {
                // Extract thinking content
                const thinkingMatch = token.match(/<think>([\s\S]*?)<\/think>/);
                if (thinkingMatch) {
                  dispatch({
                    type: ChatActionType.UPDATE_MESSAGE,
                    payload: {
                      messageId: assistantMessageId,
                      content: thinkingMatch[1],
                      section: 'thinking',
                      contentUpdateMode: ContentUpdateMode.APPEND
                    }
                  });
                }
                
                // Extract response content
                const responseContent = token.replace(/<think>[\s\S]*?<\/think>/g, '');
                if (responseContent) {
                  dispatch({
                    type: ChatActionType.UPDATE_MESSAGE,
                    payload: {
                      messageId: assistantMessageId,
                      content: responseContent,
                      section: 'response',
                      contentUpdateMode: ContentUpdateMode.APPEND
                    }
                  });
                }
              } else {
                // No section markers, update response content
                dispatch({
                  type: ChatActionType.UPDATE_MESSAGE,
                  payload: {
                    messageId: assistantMessageId,
                    content: token,
                    contentUpdateMode: ContentUpdateMode.APPEND
                  }
                });
              }
            }
          },
          onStatusUpdate: (status) => {
            if (!isMounted.current) {
              if (unregisterHandler) unregisterHandler();
              return;
            }
            
            // Only use this for fallback if WebSocket fails
            if (!wsConnectedRef.current) {
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: assistantMessageId,
                  status
                }
              });
            }
          },
          onComplete: (response) => {
            if (!isMounted.current) {
              if (unregisterHandler) unregisterHandler();
              return;
            }
            
            // Only use this for fallback if WebSocket fails
            if (!wsConnectedRef.current) {
              // Update with final content
              dispatch({
                type: ChatActionType.UPDATE_MESSAGE,
                payload: {
                  messageId: assistantMessageId,
                  content: response.content,
                  status: MessageStatus.COMPLETE,
                  isComplete: true
                }
              });
              
              // Reload conversations to get updated titles
              loadConversations();
            }
            
            // Clean up handler
            if (unregisterHandler) {
              unregisterHandler();
            }
          },
          onError: (error) => {
            if (!isMounted.current) {
              if (unregisterHandler) unregisterHandler();
              return;
            }
            
            console.error('Error sending message:', error);
            
            // Update messages to show error
            dispatch({
              type: ChatActionType.UPDATE_MESSAGE,
              payload: {
                messageId: assistantMessageId,
                status: MessageStatus.ERROR,
                metadata: { error }
              }
            });
            
            showError('Failed to send message');
            
            // Clean up handler
            if (unregisterHandler) {
              unregisterHandler();
            }
          }
        }
      );
      
      // Clear selected file if used
      selectedFileRef.current = null;
    } catch (error) {
      console.error('Error in send message flow:', error);
      
      if (isMounted.current) {
        // Update messages to show error
        dispatch({
          type: ChatActionType.UPDATE_MESSAGE,
          payload: {
            messageId: assistantMessageId,
            status: MessageStatus.ERROR,
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
          }
        });
        
        showError('Failed to send message');
      }
    }
  }, [
    state.activeConversationId,
    initializeWebSocketConnection,
    loadConversations,
    navigate
  ]);
  
  // Regenerate the last assistant message
  const regenerateLastMessage = useCallback(async () => {
    // Find all messages and convert from record to array
    const messages = Object.values(state.messages)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === MessageRole.USER);
    
    if (lastUserMessageIndex === -1) {
      showError('No user message found to regenerate from');
      return;
    }
    
    // Get the user message to regenerate from
    const userMessageIndex = messages.length - 1 - lastUserMessageIndex;
    const userMessage = messages[userMessageIndex];
    
    // Send this message again to regenerate the response
    await sendMessage(userMessage.content);
  }, [state.messages, sendMessage]);
  
  // Stop ongoing message generation
  const stopGeneration = useCallback(() => {
    // Find messages that are currently generating
    const generatingMessages = Object.values(state.messages).filter(msg => 
      msg.status === MessageStatus.STREAMING || 
      msg.status === MessageStatus.PROCESSING || 
      msg.status === MessageStatus.QUEUED
    );
    
    // Mark all generating messages as complete
    generatingMessages.forEach(msg => {
      dispatch({
        type: ChatActionType.UPDATE_MESSAGE,
        payload: {
          messageId: msg.id,
          status: MessageStatus.COMPLETE,
          metadata: { stopped: true }
        }
      });
    });
  }, [state.messages]);
  
  // File handling
  const handleFileSelect = useCallback((file: File) => {
    selectedFileRef.current = file;
  }, []);
  
  const clearSelectedFile = useCallback(() => {
    selectedFileRef.current = null;
  }, []);
  
  // Compute useful derived state values
  const isGenerating = Object.values(state.messages).some(msg => 
    msg.status === MessageStatus.STREAMING || 
    msg.status === MessageStatus.PROCESSING || 
    msg.status === MessageStatus.QUEUED
  );
  
  const sortedMessages = Object.values(state.messages)
    .sort((a, b) => a.timestamp - b.timestamp);
  
  const conversationList = Object.values(state.conversations)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  
  const activeConversation = state.activeConversationId 
    ? state.conversations[state.activeConversationId] || null
    : null;
  
  return {
    // State
    state,
    
    // Conversation management
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteCurrentConversation,
    updateConversationTitle: updateCurrentConversationTitle,
    
    // Message management
    sendMessage,
    regenerateLastMessage,
    stopGeneration,
    
    // WebSocket management
    isWebSocketConnected: wsConnectedRef.current,
    
    // UI state helpers
    isGenerating,
    activeConversation,
    sortedMessages,
    conversationList,
    
    // File handling
    handleFileSelect,
    clearSelectedFile,
    selectedFile: selectedFileRef.current
  };
}