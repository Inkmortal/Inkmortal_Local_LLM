import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ChatWindow from '../../components/chat/ChatWindow';
import ChatInput from '../../components/chat/ChatInput';
import FileUpload from '../../components/education/FileUpload';
import Button from '../../components/ui/Button';
import ThemeSelector from '../../components/ui/ThemeSelector';
import { v4 as uuidv4 } from 'uuid';
import { MockChatService, ChatRequestParams } from '../../services/chatService';

// Message type definition for UI
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const ModernChatPage: React.FC = () => {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize conversation when component mounts
  useEffect(() => {
    const initConversation = async () => {
      try {
        const { conversation_id } = await MockChatService.createConversation();
        setConversationId(conversation_id);
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    };
    
    initConversation();
    
    // Create style for chat animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes pulseGlow {
        0% { box-shadow: 0 0 5px rgba(0, 0, 0, 0.1); }
        50% { box-shadow: 0 0 20px rgba(0, 0, 0, 0.2); }
        100% { box-shadow: 0 0 5px rgba(0, 0, 0, 0.1); }
      }
      
      .message-fade-in {
        animation: fadeUp 0.5s ease forwards;
      }
      
      .chat-container-shadow {
        animation: pulseGlow 3s infinite ease-in-out;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
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
    }
  };
  
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  // Suggested prompts for quick access
  const suggestedPrompts = [
    {
      title: "Solve Equation",
      prompt: "Solve the quadratic equation x² - 7x + 10 = 0 and explain each step."
    },
    {
      title: "Explain Code",
      prompt: "Explain how recursion works in programming with a simple example."
    },
    {
      title: "Science Concept",
      prompt: "Explain photosynthesis in simple terms, as if you're teaching a middle school student."
    }
  ];
  
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
      {/* Header */}
      <header 
        className="modern-navbar glass-effect py-4 px-6 flex justify-between items-center z-10 sticky top-0"
        style={{ 
          backgroundColor: `${currentTheme.colors.bgPrimary}90`,
          borderBottom: `1px solid ${currentTheme.colors.borderColor}40`,
        }}
      >
        <div className="flex items-center space-x-2">
          <svg 
            className="w-8 h-8" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: currentTheme.colors.accentPrimary }}
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 11l3 3m0 0l-3 3m3-3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>Seadragon Chat</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button 
            size="sm"
            variant="ghost"
            onClick={() => window.navigateTo('/')}
            className="hover-float"
          >
            Home
          </Button>
          {isAuthenticated && (
            <Button 
              size="sm"
              variant="ghost"
              onClick={() => window.navigateTo('/admin')}
              className="hover-float"
            >
              Admin
            </Button>
          )}
          <ThemeSelector />
        </div>
      </header>
      
      {/* Main Chat Interface */}
      <div className="flex flex-grow overflow-hidden p-4 md:p-8 relative">
        {/* Left Sidebar - Educational context */}
        <aside 
          className="hidden lg:block w-64 mr-8 rounded-2xl overflow-hidden shrink-0 animate-fade-in"
          style={{ 
            backgroundColor: currentTheme.colors.bgSecondary,
            border: `1px solid ${currentTheme.colors.borderColor}30`,
            height: 'fit-content'
          }}
        >
          <div 
            className="p-4 border-b"
            style={{ borderColor: currentTheme.colors.borderColor }}
          >
            <h3 
              className="text-lg font-medium"
              style={{ color: currentTheme.colors.accentSecondary }}
            >
              Suggested Prompts
            </h3>
          </div>
          
          <div className="p-4 space-y-4">
            {suggestedPrompts.map((item, index) => (
              <div 
                key={index}
                className="p-3 rounded-lg cursor-pointer hover-grow"
                style={{ 
                  backgroundColor: `${currentTheme.colors.accentPrimary}10`,
                  border: `1px solid ${currentTheme.colors.borderColor}30`
                }}
                onClick={() => handleSendMessage(item.prompt)}
              >
                <h4 
                  className="text-sm font-medium mb-1"
                  style={{ color: currentTheme.colors.accentPrimary }}
                >
                  {item.title}
                </h4>
                <p 
                  className="text-xs truncate"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  {item.prompt}
                </p>
              </div>
            ))}
            
            <div className="pt-4 border-t" style={{ borderColor: currentTheme.colors.borderColor }}>
              <h4 
                className="text-sm font-medium mb-2"
                style={{ color: currentTheme.colors.textPrimary }}
              >
                Features
              </h4>
              
              <ul className="space-y-2 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                <li className="flex items-center">
                  <span 
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: currentTheme.colors.accentPrimary }}
                  />
                  Math equation rendering with LaTeX
                </li>
                <li className="flex items-center">
                  <span 
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: currentTheme.colors.accentSecondary }}
                  />
                  Code syntax highlighting
                </li>
                <li className="flex items-center">
                  <span 
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: currentTheme.colors.accentTertiary }}
                  />
                  Image upload for textbook help
                </li>
              </ul>
            </div>
          </div>
        </aside>
        
        {/* Main Chat Window */}
        <div 
          className="flex-grow flex flex-col overflow-hidden rounded-2xl chat-container-shadow animate-fade-in"
          style={{ 
            backgroundColor: currentTheme.colors.bgSecondary,
            border: `1px solid ${currentTheme.colors.borderColor}30`,
          }}
        >
          {/* Message area */}
          <div 
            className="flex-grow overflow-y-auto p-4 modern-scrollbar"
            style={{ backgroundColor: currentTheme.colors.bgPrimary }}
          >
            <div className="max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className={`message-fade-in`}
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0
                  }}
                >
                  <div 
                    className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role !== 'user' && (
                      <div 
                        className="flex items-center justify-center h-8 w-8 rounded-full overflow-hidden mr-2 flex-shrink-0"
                        style={{ 
                          backgroundColor: message.role === 'system' 
                            ? currentTheme.colors.accentSecondary 
                            : currentTheme.colors.accentPrimary 
                        }}
                      >
                        {message.role === 'assistant' ? (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                      </div>
                    )}
                    
                    <div 
                      className={`message-bubble ${message.role === 'user' ? 'message-user' : 'message-assistant'} max-w-[80%]`}
                      style={{ 
                        backgroundColor: message.role === 'system'
                          ? `${currentTheme.colors.accentSecondary}20`
                          : message.role === 'user'
                            ? currentTheme.colors.accentPrimary
                            : currentTheme.colors.bgSecondary,
                        color: message.role === 'user' 
                          ? '#fff' 
                          : currentTheme.colors.textPrimary,
                        border: message.role !== 'user' 
                          ? `1px solid ${currentTheme.colors.borderColor}50` 
                          : 'none',
                        borderRadius: '18px',
                        padding: '0.75rem 1rem',
                        position: 'relative',
                        marginBottom: '0.75rem'
                      }}
                    >
                      <div 
                        className="whitespace-pre-wrap break-words"
                        style={{ 
                          lineHeight: 1.5
                        }}
                      >
                        {message.content}
                      </div>
                      
                      <div 
                        className="text-xs mt-1 text-right opacity-70"
                        style={{ 
                          color: message.role === 'user' ? '#fff' : currentTheme.colors.textMuted
                        }}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    {message.role === 'user' && (
                      <div 
                        className="flex items-center justify-center h-8 w-8 rounded-full overflow-hidden ml-2 flex-shrink-0"
                        style={{ backgroundColor: currentTheme.colors.accentTertiary }}
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex justify-start mb-4 message-fade-in">
                  <div 
                    className="message-bubble message-assistant"
                    style={{ 
                      backgroundColor: currentTheme.colors.bgSecondary,
                      border: `1px solid ${currentTheme.colors.borderColor}50`,
                      color: currentTheme.colors.textPrimary,
                      borderRadius: '18px',
                      padding: '0.75rem 1rem',
                    }}
                  >
                    <div className="typing-indicator">
                      <span style={{ backgroundColor: currentTheme.colors.accentPrimary }}></span>
                      <span style={{ backgroundColor: currentTheme.colors.accentPrimary }}></span>
                      <span style={{ backgroundColor: currentTheme.colors.accentPrimary }}></span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* File upload area */}
          {showFileUpload && (
            <div 
              className="p-4 border-t animate-slide-up"
              style={{ borderColor: currentTheme.colors.borderColor }}
            >
              <FileUpload
                onFileSelect={handleFileSelect}
                label="Upload an image or PDF to analyze"
              />
            </div>
          )}
          
          {/* Input area */}
          <div 
            className="p-4 border-t"
            style={{ borderColor: currentTheme.colors.borderColor }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-2">
                <Button
                  size="sm"
                  variant={showFileUpload ? "default" : "outline"}
                  className="button-shimmer"
                  onClick={() => setShowFileUpload(!showFileUpload)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {showFileUpload ? "Hide Upload" : "Attach File"}
                </Button>
                
                {selectedFile && (
                  <div 
                    className="text-xs px-2 py-1 rounded-lg animate-fade-in"
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
                placeholder="Type your educational question..."
              />
              
              <div 
                className="text-xs mt-2 text-center opacity-70"
                style={{ color: currentTheme.colors.textMuted }}
              >
                Try using LaTeX equations like $E=mc^2$ or code snippets using ```language code blocks
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChatPage;