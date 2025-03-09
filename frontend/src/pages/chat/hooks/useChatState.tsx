import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  sendMessage, 
  createConversation, 
  getConversation, 
  listConversations, 
  MessageStatus 
} from '../../../services/chat';
import { Message, ChatRequestParams, Conversation } from '../types/chat';
import { showError, showInfo, showSuccess } from '../../../utils/notifications';

// Token counting utility function (rough estimate)
// This is a simplified version - a proper tokenizer would be more accurate
function estimateTokenCount(text: string): number {
  // Average English word is ~4 characters + 1 for space
  // GPT models use ~1.3 tokens per word
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}

interface UseChatStateProps {
  initialConversationId?: string;
}

export const useChatState = ({ initialConversationId }: UseChatStateProps = {}) => {
  // Message state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?',
      timestamp: new Date(),
      status: MessageStatus.COMPLETE
    }
  ]);

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [conversationLoading, setConversationLoading] = useState(false);

  // Enhanced UI state for more granular loading tracking
  const [messageLoading, setMessageLoading] = useState(false);        // General loading state
  const [isGenerating, setIsGenerating] = useState(false);            // LLM is generating a response
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);    // Network request in progress
  const [isQueueLoading, setIsQueueLoading] = useState(false);        // Message is in queue
  const [isProcessing, setIsProcessing] = useState(false);            // Message is being processed
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  
  // Track if the component is mounted to avoid state updates after unmounting
  const isMountedRef = useRef(true);
  
  // Record last successful API call timestamp to avoid rapid requests
  const lastApiCallRef = useRef(Date.now() - 10000);
  
  // On unmount, update the ref to prevent state updates
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Load conversation history with throttling to prevent hammering the server
  const loadConversations = useCallback(async () => {
    // Check if mounted and enough time has passed since last API call (at least 1 second)
    if (!isMountedRef.current || Date.now() - lastApiCallRef.current < 1000) {
      return;
    }
    
    try {
      // Update last API call time
      lastApiCallRef.current = Date.now();
      
      if (isMountedRef.current) {
        setIsNetworkLoading(true);
      }
      
      const result = await listConversations();
      
      if (!isMountedRef.current) return;
      
      // Always update conversations, even with empty array
      const formattedConversations = result.map(conv => ({
        id: conv.conversation_id,
        title: conv.title || "New conversation",
        date: new Date(conv.created_at)
      }));
      
      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      if (isMountedRef.current) {
        // Set empty conversations on error to avoid stale data
        setConversations([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsNetworkLoading(false);
      }
    }
  }, []);
  
  // Load conversation if ID is provided
  const loadConversation = useCallback(async (id?: string) => {
    const conversationIdToLoad = id || initialConversationId;
    if (conversationIdToLoad && isMountedRef.current) {
      setConversationLoading(true);
      setIsNetworkLoading(true);
      try {
        // Record API call time
        lastApiCallRef.current = Date.now();
        
        const conversationData = await getConversation(conversationIdToLoad);
        
        if (!isMountedRef.current) return;
        
        if (!conversationData) {
          console.error('Conversation not found or error loading conversation');
          createNewConversation();
          return;
        }
        
        // Map API messages to UI format
        const uiMessages: Message[] = conversationData.messages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          status: msg.status || MessageStatus.COMPLETE,
          error: msg.error
        }));
        
        setMessages(uiMessages);
        setConversationId(conversationData.conversation_id);
      } catch (error) {
        console.error('Error loading conversation:', error);
        // If conversation doesn't exist, create a new one
        if (isMountedRef.current) {
          createNewConversation();
        }
      } finally {
        if (isMountedRef.current) {
          setConversationLoading(false);
          setIsNetworkLoading(false);
        }
      }
    }
  }, [initialConversationId]);
  
  // Run loadConversation when the component mounts
  useEffect(() => {
    // Check if we have an auth token before attempting API calls
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('No auth token found - skipping conversation initialization');
      return;
    }
    
    // Load conversation list
    loadConversations();
    
    if (initialConversationId) {
      loadConversation();
    } else if (!conversationId) {
      // Create a new conversation if no ID is provided
      createNewConversation();
    }
  }, [initialConversationId, loadConversation, conversationId, loadConversations]);
  
  // Function to create a new conversation
  const createNewConversation = async () => {
    // Check for auth token first
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('Cannot create conversation - user not authenticated');
      return;
    }
    
    if (isMountedRef.current) {
      setConversationLoading(true);
      setIsNetworkLoading(true);
    }
    
    try {
      // Record API call time
      lastApiCallRef.current = Date.now();
      
      const response = await createConversation();
      
      if (!isMountedRef.current) return;
      
      if (response) {
        setConversationId(response.conversation_id);
        // Reset messages to just the welcome message
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I\'m your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?',
          timestamp: new Date(),
          status: MessageStatus.COMPLETE
        }]);
        
        // Refresh conversation list
        setTimeout(() => {
          if (isMountedRef.current) {
            loadConversations();
          }
        }, 500);
      } else {
        console.error('Failed to create conversation - response was null');
        
        // Show error notification
        showError('Failed to create a new conversation. Using local mode instead.', 'Chat Error');
        
        // Even if we failed to create a conversation, still show the welcome message
        // so the user can still use the chat interface
        setMessages([{
          id: 'local-welcome',
          role: 'assistant',
          content: 'Hello! I\'m your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?',
          timestamp: new Date(),
          status: MessageStatus.COMPLETE
        }]);
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
      
      // Show error notification
      showError(
        error instanceof Error ? error.message : 'Failed to create a new conversation',
        'Chat Error'
      );
      
      // Even on error, we still want to show a welcome message
      if (isMountedRef.current) {
        setMessages([{
          id: 'error-welcome',
          role: 'assistant',
          content: 'Hello! I\'m your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?',
          timestamp: new Date(),
          status: MessageStatus.COMPLETE
        }]);
      }
    } finally {
      if (isMountedRef.current) {
        setConversationLoading(false);
        setIsNetworkLoading(false);
      }
    }
  };