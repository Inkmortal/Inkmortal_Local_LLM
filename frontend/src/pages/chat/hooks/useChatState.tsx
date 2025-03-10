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
  closeWebSocket,
  addConnectionListener,
  isWebSocketConnected
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
  // CHANGED: Empty initial message state (Claude/ChatGPT style)
  // We'll show placeholder UI instead of an initial message
  const [messages, setMessages] = useState<Message[]>([]);

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
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false); // New: track connection status
  
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
  
  // On mount, initialize WebSocket connection with enhanced error handling and reconnection
  useEffect(() => {
    // Track mounted state
    isMountedRef.current = true;
    
    // Track connection status handler removal function
    let connectionStatusRemover: (() => void) | null = null;
    
    const initializeWebSocketConnection = async () => {
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        console.warn('No auth token found - cannot initialize WebSocket');
        return;
      }
      
      try {
        // Initialize WebSocket with proper error handling
        const connected = await initializeWebSocket(authToken);
        
        if (!isMountedRef.current) return;
        
        if (connected) {
          wsInitializedRef.current = true;
          console.log('WebSocket connection established successfully');
          
          // Update connection status in UI
          setConnectionStatus(true);
          
          // Register for connection status updates
          connectionStatusRemover = addConnectionListener((isConnected) => {
            if (!isMountedRef.current) return;
            
            // Update UI connection status
            setConnectionStatus(isConnected);
            
            if (!isConnected && wsInitializedRef.current) {
              console.warn('WebSocket connection lost - will attempt auto-reconnect');
              // WebSocketManager handles reconnection internally
            }
          });
        } else {
          console.warn('WebSocket initialization returned false - fallback mode may be used');
          setConnectionStatus(false);
        }
      } catch (error) {
        if (!isMountedRef.current) return;
        
        console.error('WebSocket initialization failed:', 
          error instanceof Error ? error.message : 'Unknown error');
          
        // Show error notification for WebSocket failures
        showError(
          'Chat connection failed. Some features may be limited.',
          'Connection Error'
        );
        
        setConnectionStatus(false);
      }
    };
    
    // Attempt WebSocket connection
    initializeWebSocketConnection();
    
    // Set up auto-reconnect if connection is lost
    const reconnectInterval = setInterval(() => {
      if (!isMountedRef.current) return;
      
      // Only try to reconnect if we were previously connected but current status shows disconnected
      if (wsInitializedRef.current && !isWebSocketConnected()) {
        console.log('Attempting to re-establish WebSocket connection...');
        initializeWebSocketConnection();
      }
    }, 30000); // Check every 30 seconds
    
    // Comprehensive cleanup function
    return () => {
      // Mark component as unmounted first to prevent further state updates
      isMountedRef.current = false;
      
      // Clear auto-reconnect interval
      clearInterval(reconnectInterval);
      
      // Remove connection status listener
      if (connectionStatusRemover) {
        connectionStatusRemover();
      }
      
      // Clean up token buffer to prevent memory leaks
      if (tokenBufferRef.current) {
        tokenBufferRef.current.dispose();
        tokenBufferRef.current = null;
      }
      
      // Close WebSocket connection when component unmounts
      if (wsInitializedRef.current) {
        console.log('Closing WebSocket connection on unmount');
        closeWebSocket();
        wsInitializedRef.current = false;
      }
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
            // MODIFIED: Don't automatically create a new conversation
            // Instead, show empty state and let user start a new chat
            setConversationId(undefined);
            setMessages([]);
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
            console.log("Conversation not found (404), setting empty state");
            // MODIFIED: Don't automatically create a new conversation
            // Instead, show empty state and let user start a new chat
            setConversationId(undefined);
            setMessages([]);
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
  
  // CHANGED: Run loadConversation when the component mounts - now only loads existing conversations
  useEffect(() => {
    // Check if we have an auth token before attempting API calls
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('No auth token found - skipping conversation initialization');
      return;
    }
    
    // Load conversation list (but don't create a new one automatically)
    loadConversations();
    
    // Only load conversation if an ID is provided - don't auto-create
    if (initialConversationId) {
      loadConversation();
    }
    
    // Don't auto-create conversation when component mounts
    // Instead, we'll create it when the user sends their first message
    // This follows the ChatGPT/Claude approach where you start with an empty state
  }, [initialConversationId, loadConversation, loadConversations]);
  
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
        // MODIFIED: Don't add welcome message here - it will be added by the server
        setMessages([]);
        
        // Refresh conversation list
        setTimeout(() => {
          if (isMountedRef.current) {
            loadConversations();
          }
        }, 500);
        
        return response.conversation_id;
      } else {
        console.error('Failed to create conversation - response was null');
        
        // Show error notification
        showError('Failed to create a new conversation. Using local mode instead.', 'Chat Error');
        
        // Set empty messages so UI can show the empty state
        setMessages([]);
        return null;
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
      
      // Show error notification
      showError(
        error instanceof Error ? error.message : 'Failed to create a new conversation',
        'Chat Error'
      );
      
      // Set empty messages so UI can show the empty state
      if (isMountedRef.current) {
        setMessages([]);
      }
      return null;
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
    
    // Check if conversation ID exists - if not, create one first
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      console.log('No conversation ID - creating new conversation before sending message');
      try {
        // CHANGED: Create conversation on demand - this is the key change to avoid duplicate conversations
        activeConversationId = await createNewConversation();
        if (!activeConversationId) {
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
    
    // Clean up existing token buffer if it exists
    if (tokenBufferRef.current) {
      tokenBufferRef.current.dispose();
      tokenBufferRef.current = null;
    }
    
    // Initialize token buffer for efficient streaming updates
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
        conversation_id: activeConversationId,
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
          if (tokenBufferRef.current && !tokenBufferRef.current.isDisposed()) {
            tokenBufferRef.current.addTokens(token);
          } else {
            // Fallback to direct update if buffer is not initialized or disposed
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
          if (tokenBufferRef.current && !tokenBufferRef.current.isDisposed()) {
            tokenBufferRef.current.flush();
          }
          
          // Dispose token buffer
          if (tokenBufferRef.current) {
            tokenBufferRef.current.dispose();
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
    connectionStatus, // New: expose connection status to UI
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