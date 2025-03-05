import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, createConversation, getConversation } from '../../../services/chatService';
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
      timestamp: new Date()
    }
  ]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  
  // Load conversation if ID is provided
  const loadConversation = useCallback(async () => {
    if (initialConversationId) {
      setLoading(true);
      try {
        const conversationData = await getConversation(initialConversationId);
        
        // Map API messages to UI format
        const uiMessages: Message[] = conversationData.messages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(msg.created_at)
        }));
        
        setMessages(uiMessages);
        setConversationId(conversationData.conversation_id);
      } catch (error) {
        console.error('Error loading conversation:', error);
        // If conversation doesn't exist, create a new one
        createNewConversation();
      } finally {
        setLoading(false);
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
    
    if (initialConversationId) {
      loadConversation();
    } else if (!conversationId) {
      // Create a new conversation if no ID is provided
      createNewConversation();
    }
  }, [initialConversationId, loadConversation, conversationId]);
  
  // Function to create a new conversation
  const createNewConversation = async () => {
    // Check for auth token first
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.warn('Cannot create conversation - user not authenticated');
      return;
    }
    
    try {
      const response = await createConversation();
      setConversationId(response.conversation_id);
      // Reset messages to just the welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I\'m your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      // Don't set error message here - let the API function handle it
    }
  };
  
  // Code and math insertion refs
  const codeInsertRef = useRef<(codeSnippet: string) => void>();
  const mathInsertRef = useRef<(mathSnippet: string) => void>();

  // For storing modal opening functions
  const openMathModalRef = useRef<() => void>(() => console.log("Math modal ref not initialized"));
  const openCodeModalRef = useRef<() => void>(() => console.log("Code modal ref not initialized"));

  // Handle sending a message
  const handleSendMessage = async (messageText: string) => {
    if (messageText.trim() === '') return;
    
    // Estimate token count for analytics
    const estimatedTokens = estimateTokenCount(messageText);
    console.log(`Estimated tokens in message: ${estimatedTokens}`);
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setIsGenerating(true);
    
    try {
      // Prepare request params
      const requestParams: ChatRequestParams = {
        message: messageText,
        conversation_id: conversationId,
        file: selectedFile || undefined
      };
      
      // Call real API service
      const response = await sendMessage(requestParams);
      
      // Add assistant response
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(response.created_at)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Track token usage of response
      const responseTokens = estimateTokenCount(response.content);
      console.log(`Estimated tokens in response: ${responseTokens}`);
      console.log(`Total estimated token usage: ${estimatedTokens + responseTokens}`);
      
      // Save conversation ID if not already set
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }
      
      // Clear file after sending
      if (selectedFile) {
        setSelectedFile(null);
        setShowFileUpload(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsGenerating(false);
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
    setLoading(true);
    setIsGenerating(true);
    
    try {
      // Call the API again with the same user message
      const requestParams: ChatRequestParams = {
        message: lastUserMessage.content,
        conversation_id: conversationId
      };
      
      const response = await sendMessage(requestParams);
      
      // Add new assistant response
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(response.created_at)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error regenerating response:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'system',
        content: 'Sorry, there was an error regenerating the response. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  };
  
  // Handle stopping generation
  const handleStopGeneration = useCallback(() => {
    // In a real application, this would cancel the API request
    setIsGenerating(false);
    setLoading(false);
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

  return {
    // State
    messages,
    loading,
    isGenerating,
    selectedFile,
    showFileUpload,
    conversationId,
    codeInsertRef,
    mathInsertRef,
    
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
  };
};

export default useChatState;