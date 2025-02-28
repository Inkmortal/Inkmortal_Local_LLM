import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MockChatService } from '../../../services/chatService';
import { Message, ChatRequestParams } from '../types/chat';

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
  
  // Code and math insertion refs
  const codeInsertRef = useRef<(codeSnippet: string) => void>();
  const mathInsertRef = useRef<(mathSnippet: string) => void>();

  // Handle sending a message
  const handleSendMessage = async (messageText: string) => {
    if (messageText.trim() === '') return;
    
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
      
      // Call mock service (will be replaced with real API)
      const response = await MockChatService.sendMessage(requestParams);
      
      // Add assistant response
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(response.created_at)
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
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
      
      const response = await MockChatService.sendMessage(requestParams);
      
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

  // Handler for inserting code template using the language selector
  const handleInsertCode = useCallback((languageArg?: string, templateArg?: string) => {
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
      codeInsertRef.current(codeSnippet);
    }
  }, []);

  // Handler for inserting math formula using the formula selector
  const handleInsertMath = useCallback((formulaArg?: string) => {
    // Default formula if none provided
    const defaultFormula = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    
    // Use provided formula or default
    const formula = formulaArg || defaultFormula;
    
    // LaTeX math template with display mode syntax for LLM compatibility
    const mathSnippet = `$$${formula}$$`;
    
    // Use the registered callback to insert at cursor position
    if (mathInsertRef.current) {
      mathInsertRef.current(mathSnippet);
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
  };
};

export default useChatState;