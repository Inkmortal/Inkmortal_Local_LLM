/**
 * Conversation management hook
 * 
 * Handles creating, loading, updating, and deleting conversations
 */
import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message, MessageRole, MessageStatus, Conversation } from '../types/message';
import { ChatActionType } from '../reducers/chatReducer';
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle as updateConvTitle
} from '../../../services/chat/conversationService';
import { showError, showSuccess, showInfo } from '../../../utils/notifications';

/**
 * Hook for conversation-related functionality
 * 
 * @param state Current chat state
 * @param dispatch Reducer dispatch function
 * @param isMounted Reference to component mount state
 * @returns Conversation management functions
 */
export function useChatConversations(
  state: any,
  dispatch: React.Dispatch<any>,
  isMounted: React.MutableRefObject<boolean>
) {
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);
  
  /**
   * Load all conversations for the current user
   */
  const loadConversations = useCallback(async () => {
    if (state.isLoadingConversations) return;
    
    try {
      dispatch({ type: ChatActionType.SET_LOADING_CONVERSATIONS, payload: true });
      
      const conversationsData = await listConversations();
      
      if (isMounted.current) {
        // The conversationService now returns the array directly
        const conversationsArray = conversationsData || [];
        
        // Map API response to our Conversation type
        const conversations: Conversation[] = conversationsArray.map((convRaw: any) => ({
          id: convRaw.id,
          title: convRaw.title || 'Untitled',
          createdAt: new Date(convRaw.created_at).getTime(),
          updatedAt: new Date(convRaw.updated_at).getTime()
        }));
        
        console.log(`[useChatConversations] Processing ${conversations.length} conversations`);
        if (conversations.length > 0) {
          console.log(`[useChatConversations] First conversation: ${conversations[0].id} - ${conversations[0].title}`);
        }
        
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
  }, [state.isLoadingConversations, dispatch, isMounted]);
  
  /**
   * Load a specific conversation by ID with improved streaming message preservation
   */
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      console.warn('[useChat] Cannot load conversation - conversationId is empty');
      return;
    }
    
    if (state.isLoadingMessages) {
      console.log(`[useChat] Already loading messages, skipping load for ${conversationId}`);
      return;
    }
    
    console.log(`[useChat] Loading conversation: ${conversationId}`);
    
    // First, identify any streaming messages we need to preserve
    const streamingMessages = Object.values(state.messages).filter((msg: any) => 
      msg.status === MessageStatus.STREAMING || 
      msg.status === MessageStatus.PROCESSING ||
      msg.status === MessageStatus.QUEUED
    );
    
    if (streamingMessages.length > 0) {
      console.log(`[useChat] Found ${streamingMessages.length} streaming messages to preserve:`);
      streamingMessages.forEach((msg: any) => {
        console.log(`  - Message ${msg.id}, status: ${msg.status}, conversation: ${msg.conversationId}`);
      });
    }
    
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
      
      // Fetch conversation data with error handling
      console.log(`[useChat] Fetching conversation data for ${conversationId}`);
      const conversationData = await getConversation(conversationId);
      console.log(`[useChat] Received conversation data with ${conversationData.messages?.length || 0} messages`);
      
      // Create conversation object
      const conversation: Conversation = {
        id: conversationId,
        title: conversationData.title || 'Untitled',
        createdAt: new Date(conversationData.created_at).getTime(),
        updatedAt: new Date(conversationData.updated_at).getTime()
      };
      
      dispatch({ type: ChatActionType.ADD_CONVERSATION, payload: conversation });
      
      // Map API message format to our Message format with improved structure
      const messages: Message[] = conversationData.messages.map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        role: msg.role as MessageRole,
        content: msg.content,
        status: MessageStatus.COMPLETE, // Mark all as complete
        timestamp: new Date(msg.created_at).getTime(),
        // CRITICAL FIX: Ensure consistent message structure with sections
        sections: {
          response: { 
            content: msg.role === MessageRole.ASSISTANT ? msg.content : '', 
            visible: true 
          },
          thinking: { 
            content: '', 
            visible: true 
          }
        }
      }));
      
      // CRITICAL FIX: Verify last message status
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        
        // If last message is from user, check if it has a corresponding assistant response
        if (lastMessage.role === MessageRole.USER) {
          console.log(`[useChat] Last message is from user and has no assistant response`);
          
          // Check if there's an active streaming response for this conversation we should keep
          const activeResponse = streamingMessages.find((msg: any) => 
            msg.role === MessageRole.ASSISTANT && 
            msg.conversationId === conversationId
          );
          
          if (activeResponse) {
            console.log(`[useChat] Found active streaming response for this conversation: ${activeResponse.id}`);
            // We'll add this back via the reducer's message preservation logic
          } else {
            // No active streaming response, might need to add a placeholder in the future
            console.log(`[useChat] No active streaming response found for last user message`);
          }
        }
      }
      
      // Let the reducer handle message merging with streaming message preservation
      dispatch({ type: ChatActionType.SET_MESSAGES, payload: messages });
      
    } catch (error) {
      console.error('[useChat] Error loading conversation:', error);
      
      if (isMounted.current) {
        // CRITICAL FIX: Preserve streaming messages even on error
        if (streamingMessages.length > 0) {
          console.log(`[useChat] Preserving ${streamingMessages.length} streaming messages despite load error`);
          // Only clear messages for the target conversation
          const messagesToKeep = Object.values(state.messages).filter((msg: any) => 
            msg.conversationId !== conversationId ||
            msg.status === MessageStatus.STREAMING || 
            msg.status === MessageStatus.PROCESSING ||
            msg.status === MessageStatus.QUEUED
          );
          dispatch({ type: ChatActionType.SET_MESSAGES, payload: messagesToKeep });
        } else {
          dispatch({ type: ChatActionType.SET_MESSAGES, payload: [] });
        }
        
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
  }, [state.messages, state.isLoadingMessages, navigate, dispatch, isMounted]);
  
  /**
   * Start a new conversation - simplified to just clear state
   * Conversation will only be created when the first message is sent
   */
  const startNewConversation = useCallback(() => {
    console.log('[useChatConversations] Starting new conversation - clearing state');
    
    // Clear messages and active conversation ID
    dispatch({ type: ChatActionType.SET_MESSAGES, payload: [] });
    dispatch({ type: ChatActionType.SET_ACTIVE_CONVERSATION, payload: null });
    
    // Use React Router's navigate to update URL and ensure proper state tracking
    // Using replace: true to avoid back button issues
    navigate('/chat', { replace: true });
    
    console.log('[useChatConversations] Conversation state cleared - waiting for first message to create in database');
  }, [dispatch, navigate]);
  
  /**
   * Delete the current conversation
   */
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
  
  /**
   * Update the title of the current conversation
   */
  const updateConversationTitle = useCallback(async (title: string) => {
    if (!state.activeConversationId || !title.trim()) return;
    
    try {
      const result = await updateConvTitle(state.activeConversationId, title);
      
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
  
  return {
    loadConversations,
    loadConversation,
    startNewConversation,
    deleteCurrentConversation,
    updateConversationTitle
  };
}