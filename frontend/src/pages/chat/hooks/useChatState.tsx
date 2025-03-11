import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageStatus, Conversation } from '../types/chat';
import { sendMessage } from '../../../services/chat/messageService';
import { getConversation, listConversations, createConversation } from '../../../services/chat/conversationService';
import { showError, showInfo, showSuccess } from '../../../utils/notifications';
import { TokenBufferManager } from './TokenBufferManager';

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialLoadDoneRef = useRef(false);
  const tokenBufferRef = useRef<TokenBufferManager | null>(null);
  
  // Editor refs for code and math
  const codeInsertRef = useRef<((codeSnippet: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((mathSnippet: string) => void) | undefined>(undefined);
  
  // Load initial conversations only once at startup 
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
      
      // Abort any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clean up token buffer
      if (tokenBufferRef.current) {
        tokenBufferRef.current.dispose();
        tokenBufferRef.current = null;
      }
    };
  }, []);
  
  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      // Load conversation messages
      loadConversationMessages(activeConversationId);
    } else {
      // If no active conversation, clear messages
      setMessages([]);
    }
  }, [activeConversationId]);
  
  // Update isGenerating when messages change
  useEffect(() => {
    // Check if any messages are still being generated
    const hasGeneratingMessages = messages.some(
      msg => msg.status === MessageStatus.QUEUED || msg.status === MessageStatus.PROCESSING || msg.status === MessageStatus.STREAMING
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
        showError('Failed to load conversations. Please refresh the page to try again.');
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
        showError('Conversation could not be loaded');
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
      if (isMountedRef.current) {
        setMessages([]);
        showError('Failed to load conversation messages');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };
  
  // Function to handle sending a new message with streaming support
  const handleSendMessage = async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) return; // Don't send empty messages
    
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
      console.log("Adding messages to UI:", userMessage, assistantMessage);
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
          showInfo('Creating new conversation...');
          const newConv = await createConversation();
          if (newConv && newConv.conversation_id) {
            conversationId = newConv.conversation_id;
            setActiveConversationId(conversationId);
          } else {
            throw new Error('Failed to create conversation');
          }
        } catch (error) {
          console.error('Error creating conversation:', error);
          throw new Error('Failed to create a new conversation. Please try again.');
        }
      }
      
      // Initialize token buffer manager for this message
      tokenBufferRef.current = new TokenBufferManager((tokens) => {
        if (!isMountedRef.current) return;
        
        setMessages(prev => {
          const assistantMsg = prev.find(msg => 
            msg.id === `assistant-${messageId}` && 
            (msg.status === MessageStatus.STREAMING || msg.status === MessageStatus.PROCESSING)
          );
          
          if (assistantMsg) {
            return prev.map(msg => 
              msg.id === assistantMsg.id 
                ? { ...msg, content: tokens } // Replace with full tokens on each update
                : msg
            );
          }
          return prev;
        });
      }, { flushDelay: 100, maxBufferSize: 50 });
      
      // Send the message with streaming handlers
      await sendMessage(
        content, 
        conversationId, 
        fileData, 
        {
          onStart: () => {
            if (!isMountedRef.current) return;
            
            // Update user message status
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === messageId ? { ...msg, status: MessageStatus.COMPLETE } : msg
              )
            );
          },
          onStatusUpdate: (status, position) => {
            if (!isMountedRef.current) return;
            
            // Update queue position if needed
            if (position !== undefined) {
              setQueuePosition(position);
            }
            
            // Update UI state based on status
            if (status === MessageStatus.QUEUED) {
              setIsQueueLoading(true);
              setIsProcessing(false);
            } else if (status === MessageStatus.PROCESSING) {
              setIsQueueLoading(false);
              setIsProcessing(true);
            } else if (status === MessageStatus.STREAMING) {
              setIsQueueLoading(false);
              setIsProcessing(false);
            }
            
            // Update assistant message status
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === `assistant-${messageId}` ? { ...msg, status } : msg
              )
            );
          },
          onToken: (token) => {
            if (!isMountedRef.current) return;
            
            // Add tokens to buffer manager to optimize rendering
            if (tokenBufferRef.current) {
              tokenBufferRef.current.addTokens(token);
            }
          },
          onComplete: (response) => {
            if (!isMountedRef.current) return;
            
            // Flush any remaining tokens
            if (tokenBufferRef.current) {
              tokenBufferRef.current.flush();
              tokenBufferRef.current = null;
            }
            
            // Reset UI state
            setIsQueueLoading(false);
            setIsProcessing(false);
            setQueuePosition(0);
            
            // Update messages with final content
            setMessages(prevMessages => 
              prevMessages.map(msg => {
                if (msg.id === `assistant-${messageId}`) {
                  return {
                    ...msg,
                    id: response.id || msg.id,
                    content: response.content,
                    status: MessageStatus.COMPLETE
                  };
                }
                return msg;
              })
            );
          },
          onError: (error) => {
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
              
              // Reset UI state
              setIsQueueLoading(false);
              setIsProcessing(false);
              setQueuePosition(0);
              
              showError('Failed to send message. Please try again.');
            }
          }
        }
      );
      
      // Load conversations list once if we created a new conversation
      if (needsConversationCreation) {
        await loadConversations();
      }
    } catch (error) {
      console.error('Error in message send flow:', error);
      
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
    if (!activeConversationId) {
      showError('No active conversation to regenerate');
      return;
    }
    
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(msg => msg.role === 'user');
    
    if (lastUserMessageIndex === -1) {
      showError('No user message found to regenerate from');
      return;
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
      // Handle regeneration like a normal message
      await handleSendMessage(userMessage.content, null);
    } catch (error) {
      console.error('Error regenerating response:', error);
      
      if (isMountedRef.current) {
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
          if (msg.status === MessageStatus.PROCESSING || 
              msg.status === MessageStatus.QUEUED || 
              msg.status === MessageStatus.STREAMING) {
            return { ...msg, status: MessageStatus.COMPLETE, content: msg.content + ' [Stopped]' };
          }
          return msg;
        })
      );
      
      setIsGenerating(false);
      setIsQueueLoading(false);
      setIsProcessing(false);
      
      // Clean up token buffer
      if (tokenBufferRef.current) {
        tokenBufferRef.current.dispose();
        tokenBufferRef.current = null;
      }
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
