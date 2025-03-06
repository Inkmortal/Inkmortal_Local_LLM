import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  sendMessage, 
  createConversation, 
  getConversation, 
  listConversations, 
  MessageStatus 
} from '../../../services/chat';
import { Message, ChatRequestParams } from '../types/chat';

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
  const [conversations, setConversations] = useState<Array<{id: string, title: string, date: Date}>>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [conversationLoading, setConversationLoading] = useState(false);

  // UI state
  const [messageLoading, setMessageLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  
  // Load conversation history
  const loadConversations = useCallback(async () => {
    try {
      const result = await listConversations();
      
      if (result.length > 0) {
        const formattedConversations = result.map(conv => ({
          id: conv.conversation_id,
          title: conv.title,
          date: new Date(conv.created_at)
        }));
        
        setConversations(formattedConversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);
  
  // Load conversation if ID is provided
  const loadConversation = useCallback(async () => {
    if (initialConversationId) {
      setConversationLoading(true);
      try {
        const conversationData = await getConversation(initialConversationId);
        
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
        createNewConversation();
      } finally {
        setConversationLoading(false);
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
    
    setConversationLoading(true);
    try {
      const response = await createConversation();
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
        loadConversations();
      } else {
        console.error('Failed to create conversation - response was null');
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    } finally {
      setConversationLoading(false);
    }
  };
  
  // Code and math insertion refs
  const codeInsertRef = useRef<(codeSnippet: string) => void>();
  const mathInsertRef = useRef<(mathSnippet: string) => void>();

  // For storing modal opening functions
  const openMathModalRef = useRef<() => void>(() => console.log("Math modal ref not initialized"));
  const openCodeModalRef = useRef<() => void>(() => console.log("Code modal ref not initialized"));

  // Update a message's status
  const updateMessageStatus = useCallback((messageId: string, status: MessageStatus, error?: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, status, ...(error && { error }) }
        : msg
    ));
  }, []);

  // Handle sending a message
  const handleSendMessage = async (messageText: string) => {
    if (messageText.trim() === '') return;
    
    // Estimate token count for analytics
    const estimatedTokens = estimateTokenCount(messageText);
    console.log(`Estimated tokens in message: ${estimatedTokens}`);
    
    // Generate a predictable ID for tracking this message
    const messageId = uuidv4();
    
    // Add user message
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
      status: MessageStatus.SENDING
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessageLoading(true);
    
    try {
      // Update user message status to show it's in the queue
      updateMessageStatus(messageId, MessageStatus.QUEUED);
      
      // Prepare request params
      const requestParams: ChatRequestParams = {
        message: messageText,
        conversation_id: conversationId,
        file: selectedFile || undefined
      };
      
      // Show that we're generating
      setIsGenerating(true);
      
      // Call real API service
      const response = await sendMessage(requestParams);
      
      // Check if the response contains an error
      if (response.status === MessageStatus.ERROR) {
        // Update the user message to show the error
        updateMessageStatus(messageId, MessageStatus.ERROR, response.error);
        
        // Add system error message
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'system',
          content: response.error || 'An error occurred while processing your message.',
          timestamp: new Date(),
          status: MessageStatus.ERROR
        };
        
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
      
      // Update user message status to complete since it was processed
      updateMessageStatus(messageId, MessageStatus.COMPLETE);
      
      // Add assistant response
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(response.created_at),
        status: response.status || MessageStatus.COMPLETE
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Track token usage of response
      const responseTokens = estimateTokenCount(response.content);
      console.log(`Estimated tokens in response: ${responseTokens}`);
      console.log(`Total estimated token usage: ${estimatedTokens + responseTokens}`);
      
      // Save conversation ID if not already set
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
        
        // Refresh conversation list
        loadConversations();
      }
      
      // Clear file after sending
      if (selectedFile) {
        setSelectedFile(null);
        setShowFileUpload(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the user message to show the error
      updateMessageStatus(messageId, MessageStatus.ERROR, 'Failed to send message');
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'Sorry, there was an unexpected error processing your request. Please try again.',
        timestamp: new Date(),
        status: MessageStatus.ERROR
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setMessageLoading(false);
      setIsGenerating(false);
      setQueuePosition(null);
    }
  };
  
  // Handle regenerating a response
  const handleRegenerate = async (messageId: string) => {
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) return;
    
    const lastUserMessage = [...messages].reverse()[lastUserMessageIndex];
    
    // Remove the last assistant message
    const newMessages = messages.filter(m => m.id !== messageId);
    setMessages(newMessages);
    
    // Regenerate answer
    setMessageLoading(true);
    setIsGenerating(true);
    
    try {
      // Call the API again with the same user message
      const requestParams: ChatRequestParams = {
        message: lastUserMessage.content,
        conversation_id: conversationId
      };
      
      const response = await sendMessage(requestParams);
      
      // Check if response has an error
      if (response.status === MessageStatus.ERROR) {
        // Add system error message
        const errorMessage: Message = {
          id: uuidv4(),
          role: 'system',
          content: response.error || 'An error occurred while regenerating the response.',
          timestamp: new Date(),
          status: MessageStatus.ERROR
        };
        
        setMessages(prev => [...prev, errorMessage]);
        return;
      }
      
      // Add new assistant response
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(response.created_at),
        status: response.status || MessageStatus.COMPLETE
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error regenerating response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'Sorry, there was an error regenerating the response. Please try again.',
        timestamp: new Date(),
        status: MessageStatus.ERROR
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setMessageLoading(false);
      setIsGenerating(false);
    }
  };
  
  // Handle stopping generation
  const handleStopGeneration = useCallback(() => {
    // In a real application, this would cancel the API request
    setIsGenerating(false);
    setMessageLoading(false);
  }, []);

  // Handler for opening modals or using templates
  const handleInsertCode = useCallback((languageArg?: string, templateArg?: string, handlerFn?: any) => {
    // Special case for registering external handlers
    if (languageArg === "REGISTER_HANDLER" && handlerFn) {
      openCodeModalRef.current = () => {
        if (handlerFn) handlerFn("OPEN_MODAL");
      };
      return;
    }
    
    // If called from action bar buttons to open modal
    if (languageArg === "OPEN_MODAL" && openCodeModalRef.current) {
      openCodeModalRef.current();
      return;
    }
    
    // Default JavaScript template if none provided
    const defaultTemplate = `function example() {
  // Your code here
  return true;
}`;

    // Default language and template
    const language = languageArg || 'javascript';
    const template = templateArg || defaultTemplate;
    
    // Create code snippet with markdown code block syntax
    const codeSnippet = `\`\`\`${language}
${template}
\`\`\``;
    
    // Use the registered callback to insert at cursor position
    if (codeInsertRef.current) {
      console.log("Using codeInsertRef from useChatState:", codeSnippet.substring(0, 50) + "...");
      codeInsertRef.current(codeSnippet);
    } else {
      console.error("codeInsertRef.current is not defined in useChatState!");
    }
  }, []);

  // Handler for opening modals or using formulas
  const handleInsertMath = useCallback((formulaArg?: string, templateArg?: string, handlerFn?: any) => {
    // Special case for registering external handlers
    if (formulaArg === "REGISTER_HANDLER" && handlerFn) {
      openMathModalRef.current = () => {
        if (handlerFn) handlerFn("OPEN_MODAL");
      };
      return;
    }
    
    // If called from action bar buttons to open modal
    if (formulaArg === "OPEN_MODAL" && openMathModalRef.current) {
      openMathModalRef.current();
      return;
    }
    
    // Default formula if none provided
    const defaultFormula = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    
    // Use provided formula or default
    const formula = formulaArg || defaultFormula;
    
    // LaTeX math template with display mode syntax for LLM compatibility
    const mathSnippet = `$$${formula}$$`;
    
    // Use the registered callback to insert at cursor position
    if (mathInsertRef.current) {
      console.log("Using mathInsertRef from useChatState:", mathSnippet.substring(0, 50) + "...");
      mathInsertRef.current(mathSnippet);
    } else {
      console.error("mathInsertRef.current is not defined in useChatState!");
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  // Switch to a different conversation
  const switchConversation = useCallback(async (id: string) => {
    if (id === conversationId) return; // Don't reload if it's the same conversation
    
    setConversationLoading(true);
    try {
      const conversationData = await getConversation(id);
      
      if (!conversationData) {
        console.error('Conversation not found or error loading conversation');
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
      setConversationId(id);
    } catch (error) {
      console.error('Error switching conversation:', error);
    } finally {
      setConversationLoading(false);
    }
  }, [conversationId]);

  return {
    // State
    messages,
    loading: messageLoading || conversationLoading,
    messageLoading,
    conversationLoading,
    isGenerating,
    selectedFile,
    showFileUpload,
    conversationId,
    conversations,
    codeInsertRef,
    mathInsertRef,
    queuePosition,
    
    // Setters
    setShowFileUpload,
    setSelectedFile,
    
    // Handlers
    handleSendMessage,
    handleRegenerate,
    handleStopGeneration,
    handleInsertCode,
    handleInsertMath,
    handleFileSelect,
    
    // Conversation management
    loadConversation,
    createNewConversation,
    switchConversation,
    updateMessageStatus
  };
};

export default useChatState;