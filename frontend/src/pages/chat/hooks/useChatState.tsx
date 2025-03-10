import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  sendMessage, 
  createConversation, 
  getConversation, 
  listConversations, 
  MessageStatus,
  ChatMode,
  sendMessageStreaming,
  initializeWebSocket,
  closeWebSocket
} from '../../../services/chat';
import { Message, ChatRequestParams, Conversation } from '../types/chat';
import { showError, showInfo, showSuccess } from '../../../utils/notifications';
import { TokenBufferManager } from './TokenBufferManager';

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
  
  // Track if WebSocket is initialized
  const wsInitializedRef = useRef(false);
  
  // Add refs for code and math insertion
  const codeInsertRef = useRef<((code: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((math: string) => void) | undefined>(undefined);
  
  // Token buffer ref for optimized streaming
  const tokenBufferRef = useRef<TokenBufferManager | null>(null);
  
  // On mount, initialize WebSocket connection
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize WebSocket connection if authenticated
    const authToken = localStorage.getItem('authToken');
    if (authToken && !wsInitializedRef.current) {
      initializeWebSocket(authToken)
        .then(() => {
          wsInitializedRef.current = true;
          console.log('WebSocket connection established');
        })
        .catch(err => {
          console.error('WebSocket initialization failed:', err);
        });
    }
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      
      // Clean up token buffer if exists
      if (tokenBufferRef.current) {
        tokenBufferRef.current.dispose();
        tokenBufferRef.current = null;
      }
      
      // Close WebSocket connection when component unmounts
      closeWebSocket();
      wsInitializedRef.current = false;
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
          // Only create a new conversation when component is mounted
          if (isMountedRef.current) {
            console.log("Conversation data is null, creating a new one");
            createNewConversation();
          }
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
        // Handle errors when loading conversations
        if (isMountedRef.current) {
          console.log("Network or other error occurred, not creating a new conversation");
          // Only create a new conversation for 404 errors (conversation not found)
          if (error instanceof Error && error.message.includes("404")) {
            console.log("Conversation not found (404), creating a new one");
            createNewConversation();
          } else {
            // Show an error notification instead
            showError("Failed to load conversation. Please try again.", "Conversation Error");
          }
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

  // Function to send a message to the LLM
  const sendUserMessage = async (messageText: string, file?: File) => {
    // Don't send if already loading or empty message
    if (messageLoading || !messageText.trim()) {
      return;
    }
    
    // Check if conversation ID exists
    if (!conversationId) {
      console.log('No conversation ID - creating new conversation before sending message');
      try {
        const response = await createConversation();
        if (response) {
          setConversationId(response.conversation_id);
        } else {
          showError('Failed to create a new conversation.', 'Chat Error');
          return;
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        showError('Failed to create a new conversation.', 'Chat Error');
        return;
      }
    }
    
    // Create message IDs for both user and assistant messages
    const userMessageId = uuidv4();
    
    // Create user message object
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      status: MessageStatus.SENDING
    };
    
    // Update UI state
    setMessageLoading(true);
    setIsNetworkLoading(true);
    
    // Add user message to the UI
    setMessages(prev => [...prev, userMessage]);
    
    // Initialize token buffer for efficient streaming updates
    if (tokenBufferRef.current) {
      tokenBufferRef.current.dispose();
    }
    
    tokenBufferRef.current = new TokenBufferManager((tokens) => {
      if (!isMountedRef.current) return;
      
      // Optimized state update with batched tokens
      setMessages(prev => {
        const assistantMsg = prev.find(msg => 
          msg.role === 'assistant' && 
          msg.status === MessageStatus.STREAMING
        );
        
        if (assistantMsg) {
          return prev.map(msg => 
            msg.id === assistantMsg.id 
              ? { ...msg, content: msg.content + tokens }
              : msg
          );
        } else {
          // First token batch - create new message
          const newAssistantMsg: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: tokens,
            timestamp: new Date(),
            status: MessageStatus.STREAMING
          };
          return [...prev, newAssistantMsg];
        }
      });
    });
    
    try {
      // Prepare request parameters
      const params: ChatRequestParams = {
        message: messageText,
        conversation_id: conversationId,
        file: file || selectedFile || undefined,
        mode: ChatMode.STREAMING // Use streaming mode (WebSockets)
      };
      
      // WebSocket-based approach with real-time status updates
      sendMessageStreaming(params, {
        onStart: () => {
          if (!isMountedRef.current) return;
          
          // Update user message to QUEUED status
          setMessages(prev => prev.map(msg => 
            msg.id === userMessageId 
              ? { ...msg, status: MessageStatus.QUEUED } 
              : msg
          ));
          
          setIsNetworkLoading(false);
          setIsQueueLoading(true);
        },
        onStatusUpdate: (status, position) => {
          if (!isMountedRef.current) return;
          
          // Update message status in UI
          setMessages(prev => prev.map(msg => 
            msg.id === userMessageId 
              ? { ...msg, status } 
              : msg
          ));
          
          // Update UI loading states
          if (status === MessageStatus.QUEUED) {
            setIsQueueLoading(true);
            setIsProcessing(false);
            setQueuePosition(position !== undefined ? position : null);
          } else if (status === MessageStatus.PROCESSING) {
            setIsQueueLoading(false);
            setIsProcessing(true);
            setQueuePosition(0);
          } else if (status === MessageStatus.STREAMING) {
            setIsQueueLoading(false);
            setIsProcessing(false);
            setIsGenerating(true);
          }
        },
        onToken: (token) => {
          if (!isMountedRef.current) return;
          
          // Add token to buffer for efficient batched updates
          // This greatly reduces the number of state updates and re-renders
          if (tokenBufferRef.current) {
            tokenBufferRef.current.addTokens(token);
          } else {
            // Fallback to direct update if buffer is not initialized
            setMessages(prev => {
              const assistantMsg = prev.find(msg => 
                msg.role === 'assistant' && 
                msg.status === MessageStatus.STREAMING
              );
              
              if (assistantMsg) {
                return prev.map(msg => 
                  msg.id === assistantMsg.id 
                    ? { ...msg, content: msg.content + token } 
                    : msg
                );
              } else {
                const newAssistantMsg: Message = {
                  id: uuidv4(),
                  role: 'assistant',
                  content: token,
                  timestamp: new Date(),
                  status: MessageStatus.STREAMING
                };
                return [...prev, newAssistantMsg];
              }
            });
          }
        },
        onComplete: (response) => {
          if (!isMountedRef.current) return;
          
          // Flush any remaining tokens in buffer
          if (tokenBufferRef.current) {
            tokenBufferRef.current.flush();
            tokenBufferRef.current = null;
          }
          
          // Create assistant message from response
          const assistantMessage: Message = {
            id: response.id,
            role: 'assistant',
            content: response.content,
            timestamp: new Date(response.created_at),
            status: MessageStatus.COMPLETE
          };
          
          // Update messages - replace any streaming message or add new message
          setMessages(prev => {
            // Find if we already have a streaming message
            const streamingIndex = prev.findIndex(msg => 
              msg.role === 'assistant' && 
              msg.status === MessageStatus.STREAMING
            );
            
            if (streamingIndex >= 0) {
              // Replace streaming message with complete message
              const newMessages = [...prev];
              newMessages[streamingIndex] = assistantMessage;
              return newMessages;
            } else {
              // Add new message
              return [...prev, assistantMessage];
            }
          });
          
          // Update user message status to complete
          setMessages(prev => prev.map(msg => 
            msg.id === userMessageId 
              ? { ...msg, status: MessageStatus.COMPLETE } 
              : msg
          ));
          
          // Reset UI states
          setMessageLoading(false);
          setIsGenerating(false);
          setIsQueueLoading(false);
          setIsProcessing(false);
          setIsNetworkLoading(false);
          setQueuePosition(null);
          setSelectedFile(null);
          setShowFileUpload(false);
          
          // Refresh conversation list after delay
          setTimeout(() => {
            if (isMountedRef.current) {
              loadConversations();
            }
          }, 500);
        },
        onError: (error) => {
          if (!isMountedRef.current) return;
          
          // Clean up token buffer on error
          if (tokenBufferRef.current) {
            tokenBufferRef.current.dispose();
            tokenBufferRef.current = null;
          }
          
          console.error('Error sending message:', error);
          
          // Update user message to show error
          setMessages(prev => prev.map(msg => 
            msg.id === userMessageId 
              ? { ...msg, status: MessageStatus.ERROR, error } 
              : msg
          ));
          
          // Show error notification
          showError(error, 'Message Error');
          
          // Reset UI states
          setMessageLoading(false);
          setIsGenerating(false);
          setIsQueueLoading(false);
          setIsProcessing(false);
          setIsNetworkLoading(false);
          setQueuePosition(null);
        }
      });
    } catch (error) {
      if (!isMountedRef.current) return;
      
      // Clean up token buffer on error
      if (tokenBufferRef.current) {
        tokenBufferRef.current.dispose();
        tokenBufferRef.current = null;
      }
      
      console.error('Error sending message:', error);
      
      // Update user message to show error
      setMessages(prev => prev.map(msg => 
        msg.id === userMessageId 
          ? { 
              ...msg, 
              status: MessageStatus.ERROR, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            } 
          : msg
      ));
      
      // Show error notification
      showError(
        error instanceof Error ? error.message : 'Failed to send message',
        'Chat Error'
      );
      
      // Reset UI states
      setMessageLoading(false);
      setIsGenerating(false);
      setIsQueueLoading(false);
      setIsProcessing(false);
      setIsNetworkLoading(false);
      setQueuePosition(null);
    }
  };
  
  // Function to retry a failed message
  const retryMessage = async (messageId: string) => {
    // Find the failed message
    const failedMessage = messages.find(msg => msg.id === messageId);
    if (!failedMessage || failedMessage.role !== 'user') {
      return;
    }
    
    // Get the message content
    const messageText = failedMessage.content;
    
    // Remove the failed message and any subsequent messages
    const failedIndex = messages.findIndex(msg => msg.id === messageId);
    if (failedIndex >= 0) {
      setMessages(messages.slice(0, failedIndex));
    }
    
    // Send the message again
    await sendUserMessage(messageText);
  };
  
  // Function to handle file selection
  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
  };
  
  // Stub methods for code and math insertion
  const handleInsertCode = (language?: string) => {
    console.log("Insert code requested - stubbed implementation", language);
  };
  
  const handleInsertMath = (formula?: string) => {
    console.log("Insert math requested - stubbed implementation", formula);
  };
  
  // Stub method for stopping generation
  const handleStopGeneration = () => {
    console.log("Stop generation requested - stubbed implementation");
  };
  
  // Return the hook API
  return {
    messages,
    conversationId,
    conversationLoading,
    messageLoading,
    isGenerating,
    isNetworkLoading,
    isQueueLoading,
    isProcessing,
    queuePosition,
    conversations,
    selectedFile,
    showFileUpload,
    sendUserMessage,
    retryMessage,
    loadConversation,
    loadConversations,
    createNewConversation,
    handleFileSelect,
    setShowFileUpload,
    
    // Add aliases for compatibility
    handleSendMessage: sendUserMessage,
    handleRegenerate: retryMessage,
    handleStopGeneration,
    switchConversation: loadConversation,
    
    // Expose refs for code and math editors
    codeInsertRef,
    mathInsertRef,
    
    // Expose stub methods
    handleInsertCode,
    handleInsertMath
  };
};

// Export the hook as default
export default useChatState;