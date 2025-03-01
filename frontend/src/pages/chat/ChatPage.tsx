import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ChatWindow from '../../components/chat/ChatWindow';
import ChatInput from '../../components/chat/ChatInput';
import FileUpload from '../../components/education/FileUpload';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ThemeSelector from '../../components/ui/ThemeSelector';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, createConversation, ChatRequestParams } from '../../services/chatService';

// Message type definition for UI
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const ChatPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your educational AI assistant. I can help with math problems, coding questions, and explain concepts from textbooks. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  
  // Initialize conversation when component mounts
  useEffect(() => {
    const initConversation = async () => {
      try {
        const { conversation_id } = await createConversation();
        setConversationId(conversation_id);
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    };
    
    initConversation();
  }, []);
  
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
    
    try {
      // Prepare request params
      const requestParams: ChatRequestParams = {
        message: messageText,
        conversation_id: conversationId,
        file: selectedFile || undefined
      };
      
      // Call mock service (will be replaced with real API)
      const response = await sendMessage(requestParams);
      
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
    }
  };
  
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };
  
  return (
    <div 
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: currentTheme.colors.bgPrimary, color: currentTheme.colors.textPrimary }}
    >
      {/* Header */}
      <header className="py-4 px-6 flex justify-between items-center shadow-sm" style={{ backgroundColor: currentTheme.colors.bgSecondary }}>
        <h1 
          className="text-xl font-semibold"
          style={{ color: currentTheme.colors.accentPrimary }}
        >
          Seadragon LLM Chat
        </h1>
        <div className="flex items-center space-x-3">
          <Button 
            size="sm"
            variant="outline"
            onClick={() => window.navigateTo('/')}
          >
            Home
          </Button>
          {isAuthenticated && (
            <Button 
              size="sm"
              variant="outline"
              onClick={() => window.navigateTo('/admin')}
            >
              Admin
            </Button>
          )}
          <ThemeSelector />
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex flex-grow overflow-hidden">
        {/* Left Sidebar - Potential future feature for chat history */}
        <div 
          className="hidden md:block w-64 p-4 overflow-y-auto border-r"
          style={{ borderColor: currentTheme.colors.borderColor }}
        >
          <h2 
            className="text-lg font-medium mb-4"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            Features
          </h2>
          <ul className="space-y-2">
            <li>
              <a 
                href="#" 
                className="block p-2 rounded-lg"
                style={{ 
                  backgroundColor: `${currentTheme.colors.accentPrimary}10`,
                  color: currentTheme.colors.textPrimary
                }}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span>Math Equations</span>
                </div>
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className="block p-2 rounded-lg"
                style={{ 
                  backgroundColor: `${currentTheme.colors.accentPrimary}10`,
                  color: currentTheme.colors.textPrimary
                }}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>Code Samples</span>
                </div>
              </a>
            </li>
            <li>
              <a 
                href="#" 
                className="block p-2 rounded-lg"
                style={{ 
                  backgroundColor: `${currentTheme.colors.accentPrimary}10`,
                  color: currentTheme.colors.textPrimary
                }}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>Text Explanations</span>
                </div>
              </a>
            </li>
          </ul>
          
          <div className="mt-8">
            <Card className="text-sm">
              <h3 
                className="text-md font-medium mb-2"
                style={{ color: currentTheme.colors.accentSecondary }}
              >
                Pro Tips
              </h3>
              <ul className="space-y-2 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                <li>• Use LaTeX for math equations</li>
                <li>• Upload textbook images for help</li>
                <li>• Try "Explain like I'm 5..." for simple answers</li>
                <li>• Use code examples to learn programming</li>
              </ul>
            </Card>
          </div>
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-grow flex flex-col h-full">
          <ChatWindow messages={messages} loading={loading} />
          
          {/* File upload area */}
          {showFileUpload && (
            <div className="p-4 border-t" style={{ borderColor: currentTheme.colors.borderColor }}>
              <FileUpload
                onFileSelect={handleFileSelect}
                label="Upload an image or PDF to analyze"
              />
            </div>
          )}
          
          {/* Input area */}
          <div 
            className="p-4 border-t flex flex-col gap-2"
            style={{ borderColor: currentTheme.colors.borderColor }}
          >
            <div className="flex justify-between items-center mb-2">
              <Button
                size="sm"
                variant={showFileUpload ? "default" : "outline"}
                className="mr-2"
                onClick={() => setShowFileUpload(!showFileUpload)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {showFileUpload ? "Hide Upload" : "Attach File"}
              </Button>
              
              {selectedFile && (
                <div 
                  className="text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: `${currentTheme.colors.accentPrimary}20`,
                    color: currentTheme.colors.textPrimary
                  }}
                >
                  {selectedFile.name} attached
                </div>
              )}
            </div>
            
            <ChatInput 
              onSend={handleSendMessage} 
              disabled={loading}
              placeholder="Type your question..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;