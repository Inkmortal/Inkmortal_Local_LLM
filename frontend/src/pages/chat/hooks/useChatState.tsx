import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageStatus, Conversation } from '../types/chat';
import { sendMessage } from '../../../services/chat/messageService';
import { getConversation, listConversations, createConversation } from '../../../services/chat/conversationService';
import { showError, showInfo, showSuccess } from '../../../utils/notifications';

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
const MESSAGE_POLL_INTERVAL = 3000;

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialLoadDoneRef = useRef(false);
  
  // Editor refs for code and math
  const codeInsertRef = useRef<((codeSnippet: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((mathSnippet: string) => void) | undefined>(undefined);
  
  // Load initial conversations only once at startup - with explicit user control 
  useEffect(() => {
    // Set isMountedRef 
    isMountedRef.current = true;
    
    // Only do the initial load once - if not already done
    if (!initialLoadDoneRef.current) {
      loadConversations();
      initialLoadDoneRef.current = true;
    }
    
    return () => {
      isMountedRef.current = false;
      
      // Clear any polling timers
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);
  
  // Load messages when conversation changes
  useEffect(() => {
    // Clear any existing polling timer
    if (pollingTimerRef.current) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    
    if (activeConversationId) {
      // Load conversation messages
      loadConversationMessages(activeConversationId);
      
      // Only set up polling if we have an active generation
      if (isGenerating) {
        pollingTimerRef.current = window.setInterval(() => {
          if (activeConversationId && isGenerating && !isLoading && !isNetworkLoading) {
            checkForMessageUpdates(activeConversationId);
          }
        }, MESSAGE_POLL_INTERVAL);
      }
    } else {
      // If no active conversation, clear messages
      setMessages([]);
    }
    
    // Cleanup on unmount or conversation change
    return () => {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [activeConversationId, isGenerating]);
  
  // Update isGenerating when messages change
  useEffect(() => {
    // Check if any messages are still being generated
    const hasGeneratingMessages = messages.some(
      msg => msg.status === MessageStatus.QUEUED || msg.status === MessageStatus.PROCESSING
    );
    
    // Only set if it changed to prevent re-renders
    if (hasGeneratingMessages !== isGenerating) {
      setIsGenerating(hasGeneratingMessages);
    }
  }, [messages, isGenerating]);
  
  // Function to load all user conversations
  const loadConversations = async () => {
    if (isNetworkLoading) return; // Prevent concurrent calls
    
    try {
      // Update last API call time
      lastApiCallRef.current = Date.now();
      
      if (isMountedRef.current) {
        setIsNetworkLoading(true);
      }
      
      const result = await listConversations();
      
      if (!isMountedRef.current) return;
      
      // Format conversations
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
        // Keep existing conversations on error
      }
    } finally {
      if (isMountedRef.current) {
        setIsNetworkLoading(false);
      }
    }
  };
  
  // Function to load messages for a specific conversation
  const loadConversationMessages = async (conversationId: string) => {
    if (!conversationId || isLoading) return;
    
    // Cancel any previous requests
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
        // If conversation not found, just clear messages
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      if (isMountedRef.current) {
        // Set empty messages on error
        setMessages([]);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };
  
  // Function to check for message updates - only called during active generation
  const checkForMessageUpdates = async (conversationId: string) => {
    // Skip if not generating or already loading
    if (!isGenerating || isLoading || isNetworkLoading) return;
    
    // Check for in-progress messages
    const inProgressMessages = messages.filter(
      msg => msg.status !== MessageStatus.COMPLETE && msg.status !== MessageStatus.ERROR
    );
    
    if (inProgressMessages.length === 0) return;
    
    // Update message statuses by reloading the conversation
    await loadConversationMessages(conversationId);
  };
  
  // Function to handle sending a new message
  const handleSendMessage = async (content: string, file: File | null = null) => {
    // Create a message ID for optimistic UI updates
    const messageId = uuidv4();
    const now = new Date();
    
    // Check if we need a new conversation
    let conversationId = activeConversationId;
    let needsConversationCreation = !conversationId;
    
    // Create temporary user message for immediate UI feedback
    const userMessage: Message = {
      id: messageId,
      conversationId: conversationId || 'temp-id',
      role: 'user',
      content,
      status: MessageStatus.SENDING,
      timestamp: now,
    };
    
    // Create a placeholder for the assistant response
    const assistantMessage: Message = {
      id: `assistant-${messageId}`,
      conversationId: conversationId || 'temp-id',
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
      // Process file if provided
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
      
      // Create a new conversation first if needed
      if (needsConversationCreation) {
        try {
          const newConv = await createConversation();
          if (newConv && newConv.conversation_id) {
            conversationId = newConv.conversation_id;
            setActiveConversationId(conversationId);
          } else {
            throw new Error('Failed to create conversation');
          }
        } catch (error) {
          console.error('Error creating conversation:', error);
          throw error;
        }
      }
      
      // Send the message
      const result = await sendMessage(content, conversationId, fileData);
      
      if (!isMountedRef.current) return;
      
      if (result.id) {
        // Update messages with real IDs
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg.id === messageId) {
              return { 
                ...msg, 
                id: result.id || msg.id, 
                conversationId: conversationId || msg.conversationId, 
                status: MessageStatus.COMPLETE 
              };
            }
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
        
        // Load conversations list once if we created a new conversation
        if (needsConversationCreation) {
          await loadConversations();
        }
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
    if (!activeConversationId) return;
    
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
    
    if (lastUserMessageIndex === -1) {
      return; // No user message found
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
    
    try {
      // Send regeneration request
      const result = await sendMessage(userMessage.content, activeConversationId, null, {
        mode: 'regenerate',
      });
      
      if (!isMountedRef.current) return;
      
      if (!result.id) {
        throw new Error(result.error || 'Unknown error during regeneration');
      }
      
      // Polling will update the messages
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
    if (isMountedRef.current) {
      // Mark all in-progress messages as complete
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
  
  // Function to start a new conversation - just UI state changes
  const handleStartNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
  };

  // File handling
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  // Placeholder functions for code and math editors
  const handleInsertCode = (language?: string, template?: string) => {
    // Implementation would be provided by parent component
  };

  const handleInsertMath = (formula?: string) => {
    // Implementation would be provided by parent component
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