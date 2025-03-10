import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageStatus, Conversation } from '../types/chat';
import { sendMessage } from '../../../services/chat/messageService';
import { getConversation, listConversations, createConversation } from '../../../services/chat/conversationService';
import { showError, showInfo, showSuccess } from '../../../utils/notifications';

// Function to provide a rough estimate of token count to avoid overloading the API
// This is a simplistic implementation; actual token counts are more complex
const estimateTokenCount = (text: string): number => {
  if (!text) return 0;
  return text.split(/\s+/).length * 1.3; // Rough estimate based on words
};

export interface ChatState {
  messages: Message[];
  conversations: Conversation[];
  activeConversationId: string | null;
  conversationId: string | null; // Alias for activeConversationId for backward compatibility
  isLoading: boolean;
  isNetworkLoading: boolean;
  isGenerating: boolean;

  // Core Actions
  sendMessage: (content: string, file?: File | null) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  stopGeneration: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  startNewConversation: () => void;
  loadConversations: () => Promise<void>;
  setActiveConversationId: (id: string | null) => void;
  
  // Legacy support aliases (for backward compatibility)
  handleSendMessage: (content: string, file?: File | null) => Promise<void>;
  handleRegenerate: (messageId: string) => Promise<void>;
  handleStopGeneration: () => void;
  switchConversation: (id: string) => Promise<void>;
  
  // File handling props
  showFileUpload: boolean;
  setShowFileUpload: (show: boolean) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  handleFileSelect: (file: File) => void;
  
  // Editor refs and handlers
  codeInsertRef: React.MutableRefObject<((codeSnippet: string) => void) | undefined>;
  mathInsertRef: React.MutableRefObject<((mathSnippet: string) => void) | undefined>;
  handleInsertCode: (language?: string, template?: string) => void;
  handleInsertMath: (formula?: string) => void;
  
  // Queue properties
  isQueueLoading: boolean;
  isProcessing: boolean;
  queuePosition: number;
}

// How frequently to poll for message updates in ms
const MESSAGE_POLL_INTERVAL = 2000;

// How frequently to refresh conversations list in ms
const CONVERSATIONS_REFRESH_INTERVAL = 30000;

interface UseChatStateOptions {
  initialConversationId?: string;
}

export default function useChatState(
  options: UseChatStateOptions = {}
): ChatState {
  const { initialConversationId } = options;
  
  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNetworkLoading, setIsNetworkLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // File upload state
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Queue state
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  
  // Refs
  const isMountedRef = useRef(true);
  const lastApiCallRef = useRef<number>(0);
  const pollingTimerRef = useRef<number | null>(null);
  const conversationsTimerRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Editor refs for code and math
  const codeInsertRef = useRef<((codeSnippet: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((mathSnippet: string) => void) | undefined>(undefined);
  
  // Load initial conversations
  useEffect(() => {
    isMountedRef.current = true;
    loadConversations();
    
    // Set up interval to refresh conversations
    conversationsTimerRef.current = window.setInterval(() => {
      // Only refresh if there hasn't been a recent API call
      const timeSinceLastApiCall = Date.now() - lastApiCallRef.current;
      if (timeSinceLastApiCall > CONVERSATIONS_REFRESH_INTERVAL / 2) {
        loadConversations();
      }
    }, CONVERSATIONS_REFRESH_INTERVAL);
    
    return () => {
      isMountedRef.current = false;
      
      // Clear intervals and abort any pending requests
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
      }
      
      if (conversationsTimerRef.current) {
        window.clearInterval(conversationsTimerRef.current);
      }
      
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadConversationMessages(activeConversationId);
    } else {
      setMessages([]);
      setIsGenerating(false);
    }
    
    // Setup polling for message updates
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
    }
    
    if (activeConversationId) {
      pollingTimerRef.current = window.setInterval(() => {
        if (activeConversationId) {
          // Only poll if we're not already loading
          if (!isLoading && !isNetworkLoading) {
            checkForMessageUpdates(activeConversationId);
          }
        }
      }, MESSAGE_POLL_INTERVAL);
    }
    
    return () => {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [activeConversationId]);
  
  // Set Generating status based on message state
  useEffect(() => {
    // Check if any messages are still being generated
    const hasGeneratingMessages = messages.some(
      msg => msg.status === MessageStatus.QUEUED || msg.status === MessageStatus.PROCESSING
    );
    setIsGenerating(hasGeneratingMessages);
  }, [messages]);
  
  // Function to load all user conversations
  const loadConversations = async () => {
    try {
      // Update last API call time
      lastApiCallRef.current = Date.now();
      
      if (isMountedRef.current) {
        setIsNetworkLoading(true);
      }
      
      const result = await listConversations();
      
      if (!isMountedRef.current) return;
      
      // Always update conversations, even with empty array
      const formattedConversations = Array.isArray(result) 
        ? result.map(conv => ({
            id: conv.conversation_id,
            title: conv.title || "New conversation",
            date: new Date(conv.created_at)
          }))
        : [];
      
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
  };
  
  // Function to load messages for a specific conversation
  const loadConversationMessages = async (conversationId: string) => {
    if (!conversationId) return;
    
    // Create a new abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      // Update last API call time
      lastApiCallRef.current = Date.now();
      
      if (isMountedRef.current) {
        setIsLoading(true);
      }
      
      console.log(`Loading messages for conversation: ${conversationId}`);
      const conversationData = await getConversation(conversationId);
      
      if (!isMountedRef.current) return;
      
      if (conversationData && Array.isArray(conversationData.messages)) {
        // Map API messages to our Message format
        const formattedMessages = conversationData.messages.map(apiMsg => ({
          id: apiMsg.id,
          conversationId: apiMsg.conversation_id,
          role: apiMsg.role,
          content: apiMsg.content,
          status: MessageStatus.COMPLETE,
          timestamp: new Date(apiMsg.created_at),
        }));
        
        setMessages(formattedMessages);
      } else {
        console.log(`No messages found for conversation: ${conversationId}`);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      if (isMountedRef.current) {
        // Set empty messages on error to avoid stale data
        setMessages([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };
  
  // Function to check for new message status updates
  const checkForMessageUpdates = async (conversationId: string) => {
    // Only check messages that are still in-progress
    const inProgressMessages = messages.filter(
      msg => msg.status !== MessageStatus.COMPLETE && msg.status !== MessageStatus.ERROR
    );
    
    if (inProgressMessages.length === 0) return;
    
    // Update message statuses
    await loadConversationMessages(conversationId);
  };
  
  // Function to handle sending a new message
  const handleSendMessage = async (content: string, file: File | null = null) => {
    // Create a new message ID for UI
    const messageId = uuidv4();
    const now = new Date();
    
    // Determine if we need to create a new conversation or use existing one
    let conversationId = activeConversationId;
    let needsConversationCreation = !conversationId;
    
    // Create temporary user message
    const userMessage: Message = {
      id: messageId,
      conversationId: conversationId || 'temp-id', // Use temp ID if we don't have one yet
      role: 'user',
      content,
      status: MessageStatus.SENDING,
      timestamp: now,
    };
    
    // Create a placeholder for the assistant's response
    const assistantMessage: Message = {
      id: `assistant-${messageId}`,
      conversationId: conversationId || 'temp-id', // Use temp ID if we don't have one yet
      role: 'assistant',
      content: '',
      status: MessageStatus.QUEUED,
      timestamp: now,
    };
    
    // Add messages to state immediately for UI feedback
    if (isMountedRef.current) {
      setMessages(prevMessages => [...prevMessages, userMessage, assistantMessage]);
    }
    
    try {
      // Create FormData if we have a file
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
      
      // If this is a new conversation, create it on the backend first
      if (needsConversationCreation) {
        console.log('Creating new conversation on backend');
        try {
          const newConv = await createConversation();
          if (newConv && newConv.conversation_id) {
            conversationId = newConv.conversation_id;
            console.log(`Created new conversation: ${conversationId}`);
            // Update active conversation ID
            setActiveConversationId(conversationId);
          } else {
            throw new Error('Failed to create conversation');
          }
        } catch (error) {
          console.error('Error creating conversation:', error);
          throw error; // Re-throw to be caught by outer catch
        }
      }
      
      // Now send the message with the confirmed conversation ID
      console.log(`Sending message to conversation: ${conversationId}`);
      const result = await sendMessage(content, conversationId, fileData);
      
      if (!isMountedRef.current) return;
      
      if (result.id) {
        // Update messages with real IDs from API
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            // Update the user message
            if (msg.id === messageId) {
              return { 
                ...msg, 
                id: result.id || msg.id, 
                conversationId: conversationId || msg.conversationId, 
                status: MessageStatus.COMPLETE 
              };
            }
            // Update the assistant message
            if (msg.id === `assistant-${messageId}`) {
              return { 
                ...msg, 
                conversationId: conversationId || msg.conversationId, 
                status: MessageStatus.PROCESSING 
              };
            }
            return msg;
          })
        );
        
        // Load conversations to get updated list
        await loadConversations();
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      if (isMountedRef.current) {
        // Update messages to show error
        setMessages(prevMessages =>
          prevMessages.map(msg => {
            if (msg.id === messageId) {
              return { ...msg, status: MessageStatus.ERROR };
            }
            if (msg.id === `assistant-${messageId}`) {
              return { ...msg, status: MessageStatus.ERROR, content: 'Failed to generate response' };
            }
            return msg;
          })
        );
        
        showError('Failed to send message. Please try again.');
      }
    }
  };
  
  // Function to regenerate the last assistant message
  const handleRegenerateLastMessage = async () => {
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
    
    if (lastUserMessageIndex === -1 || !activeConversationId) {
      return; // No user message found or no active conversation
    }
    
    // Get the actual index in the messages array
    const userMessageIndex = messages.length - 1 - lastUserMessageIndex;
    const userMessage = messages[userMessageIndex];
    
    // Remove all messages after this user message
    const truncatedMessages = messages.slice(0, userMessageIndex + 1);
    
    // Add a new assistant message
    const assistantMessage: Message = {
      id: `assistant-regen-${uuidv4()}`,
      conversationId: activeConversationId,
      role: 'assistant',
      content: '',
      status: MessageStatus.QUEUED,
      timestamp: new Date(),
    };
    
    // Update messages state
    setMessages([...truncatedMessages, assistantMessage]);
    
    // Send the message for regeneration
    try {
      // Send message to API in "regenerate" mode
      const result = await sendMessage(userMessage.content, activeConversationId, null, {
        mode: 'regenerate',
      });
      
      if (!isMountedRef.current) return;
      
      if (!result.id) {
        throw new Error(result.error || 'Unknown error during regeneration');
      }
      
      // We don't update any state here, as the polling will handle the updates
    } catch (error) {
      console.error('Error regenerating response:', error);
      
      if (isMountedRef.current) {
        // Update assistant message to show error
        setMessages(prevMessages =>
          prevMessages.map(msg => {
            if (msg.id === assistantMessage.id) {
              return { ...msg, status: MessageStatus.ERROR, content: 'Failed to regenerate response' };
            }
            return msg;
          })
        );
        
        showError('Failed to regenerate response. Please try again.');
      }
    }
  };
  
  // Function to stop ongoing generation
  const handleStopGeneration = () => {
    // Implementation would involve aborting API requests
    // This is a simplified version that just updates UI state
    
    if (isMountedRef.current) {
      // Update messages that are in-progress
      setMessages(prevMessages =>
        prevMessages.map(msg => {
          if (msg.status === MessageStatus.PROCESSING || msg.status === MessageStatus.QUEUED) {
            return { ...msg, status: MessageStatus.COMPLETE, content: msg.content + ' [Stopped]' };
          }
          return msg;
        })
      );
      
      setIsGenerating(false);
    }
  };
  
  // Function to load a specific conversation
  const handleLoadConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
  };
  
  // Function to start a new conversation
  const handleStartNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  // File handling
  const handleFileSelect = (file: File) => {
    console.log(`Selected file: ${file.name}`);
    setSelectedFile(file);
  };

  // Placeholder functions for code and math editors
  const handleInsertCode = (language?: string, template?: string) => {
    console.log(`Insert code with language: ${language || 'none'}`);
  };

  const handleInsertMath = (formula?: string) => {
    console.log(`Insert math formula: ${formula || 'none'}`);
  };

  return {
    // Core state
    messages,
    conversations,
    activeConversationId, 
    conversationId: activeConversationId, // Alias for backward compatibility
    isLoading,
    isNetworkLoading,
    isGenerating,
    
    // Core actions
    sendMessage: handleSendMessage,
    regenerateLastMessage: handleRegenerateLastMessage,
    stopGeneration: handleStopGeneration,
    loadConversation: handleLoadConversation,
    startNewConversation: handleStartNewConversation,
    loadConversations,
    setActiveConversationId,
    
    // Legacy support with aliases
    handleSendMessage,
    handleRegenerate: (messageId: string) => handleRegenerateLastMessage(),
    handleStopGeneration,
    switchConversation: handleLoadConversation,
    
    // File handling
    showFileUpload,
    setShowFileUpload,
    selectedFile,
    setSelectedFile,
    handleFileSelect,
    
    // Editor refs and handlers
    codeInsertRef,
    mathInsertRef,
    handleInsertCode,
    handleInsertMath,
    
    // Queue state
    isQueueLoading,
    isProcessing,
    queuePosition,
  };
}