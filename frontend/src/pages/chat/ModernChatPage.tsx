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
import CodeBlock from '../../components/education/CodeBlock';
import MathRenderer from '../../components/education/MathRenderer';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  
  // Chat history state
  const [conversations, setConversations] = useState<{id: string, title: string, date: Date}[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<{content: string, type: 'code' | 'math' | 'image'} | null>(null);
  
  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Initialize conversation when component mounts
  useEffect(() => {
    const initConversation = async () => {
      try {
        const { conversation_id } = await MockChatService.createConversation();
        setConversationId(conversation_id);
        
        // Mock loading previous conversations for demo
        setConversations([
          {
            id: conversation_id,
            title: "Current Conversation",
            date: new Date()
          },
          {
            id: `conv_${Date.now() - 86400000}_abc123`,
            title: "Math Discussion",
            date: new Date(Date.now() - 86400000)
          },
          {
            id: `conv_${Date.now() - 172800000}_def456`,
            title: "Python Examples",
            date: new Date(Date.now() - 172800000)
          }
        ]);
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
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @keyframes shimmer {
        0% { background-position: -100% 0; }
        100% { background-position: 100% 0; }
      }
      
      .message-fade-in {
        animation: fadeUp 0.5s ease forwards;
      }
      
      .chat-container-shadow {
        animation: pulseGlow 3s infinite ease-in-out;
      }
      
      .typing-indicator span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 5px;
        animation: bounce 1.4s infinite ease-in-out both;
      }
      
      .typing-indicator span:nth-child(1) {
        animation-delay: -0.32s;
      }
      
      .typing-indicator span:nth-child(2) {
        animation-delay: -0.16s;
      }
      
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
      
      @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }
      
      .hover-grow {
        transition: all 0.2s ease;
      }
      
      .hover-grow:hover {
        transform: scale(1.02);
      }
      
      .modern-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      
      .modern-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .modern-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(155, 155, 155, 0.5);
        border-radius: 20px;
      }
      
      .artifact-display {
        backdrop-filter: blur(8px);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Auto-scroll when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
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
  
  const handleStopGeneration = () => {
    // In a real application, this would cancel the API request
    setIsGenerating(false);
    setLoading(false);
  };
  
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
      {/* Header */}
      <header 
        className="py-4 px-6 flex justify-between items-center z-10 sticky top-0"
        style={{ 
          backgroundColor: `${currentTheme.colors.bgPrimary}E6`,
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${currentTheme.colors.borderColor}40`,
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.05)`,
        }}
      >
        <div className="flex items-center space-x-3">
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
          <div>
            <span className="text-xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>Seadragon Chat</span>
            <div className="text-xs mt-0.5" style={{ color: currentTheme.colors.textMuted }}>Powered by AI</div>
          </div>
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
      <div className="flex flex-grow h-[calc(100vh-73px)] overflow-hidden p-4 md:p-6 relative">
        {/* Left Sidebar - Conversation History */}
        <aside 
          className="hidden lg:flex flex-col w-64 mr-8 rounded-2xl overflow-hidden shrink-0 animate-fade-in h-full"
          style={{ 
            backgroundImage: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}, ${currentTheme.colors.bgTertiary})`,
            boxShadow: `0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px ${currentTheme.colors.borderColor}40`,
          }}
        >
          {/* Conversation History Section */}
          <div className="flex flex-col h-full">
            <div 
              className="px-4 py-3 border-b"
              style={{ 
                borderColor: currentTheme.colors.borderColor,
                background: `linear-gradient(90deg, ${currentTheme.colors.accentPrimary}20, transparent)`
              }}
            >
              <h3 
                className="text-lg font-medium flex items-center"
                style={{ color: currentTheme.colors.accentPrimary }}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
                Chat History
              </h3>
            </div>
            
            <div className="p-4 space-y-3 overflow-y-auto modern-scrollbar flex-grow">
              {/* This would be populated with actual history - using placeholder for now */}
              {conversations.map((conv, index) => (
                <div 
                  key={conv.id}
                  className="p-3 rounded-lg cursor-pointer transition-all hover:scale-102 relative overflow-hidden group"
                  style={{ 
                    backgroundColor: conv.id === conversationId 
                      ? `${currentTheme.colors.accentPrimary}20` 
                      : `${currentTheme.colors.bgPrimary}90`,
                    borderLeft: conv.id === conversationId 
                      ? `3px solid ${currentTheme.colors.accentPrimary}` 
                      : `1px solid ${currentTheme.colors.borderColor}50`,
                    boxShadow: conv.id === conversationId 
                      ? `0 2px 10px ${currentTheme.colors.accentPrimary}20` 
                      : 'none'
                  }}
                  onClick={() => {/* Load conversation */}}
                >
                  {/* Visual indicator for current chat */}
                  {conv.id === conversationId && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1" 
                      style={{ backgroundColor: currentTheme.colors.accentPrimary }}
                    />
                  )}
                  
                  <h4 
                    className="text-sm font-medium mb-1 flex items-center"
                    style={{ 
                      color: conv.id === conversationId 
                        ? currentTheme.colors.accentPrimary
                        : currentTheme.colors.textPrimary
                    }}
                  >
                    {index === 0 ? (
                      <>
                        <span className="relative flex h-3 w-3 mr-2">
                          <span 
                            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                            style={{ backgroundColor: currentTheme.colors.success }}
                          />
                          <span 
                            className="relative inline-flex rounded-full h-3 w-3" 
                            style={{ backgroundColor: currentTheme.colors.success }}
                          />
                        </span>
                        {conv.title}
                      </>
                    ) : (
                      conv.title
                    )}
                  </h4>
                  <p 
                    className="text-xs truncate"
                    style={{ color: currentTheme.colors.textSecondary }}
                  >
                    {index === 0 
                      ? 'Active conversation' 
                      : `Started on ${conv.date.toLocaleDateString()}`}
                  </p>
                  
                  {/* Delete button that appears on hover */}
                  <button 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full"
                    style={{ 
                      backgroundColor: `${currentTheme.colors.error}20`,
                      color: currentTheme.colors.error
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Delete conversation logic would go here
                    }}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <button 
                className="w-full p-2 rounded-lg text-sm mt-2 transition-all hover:scale-105"
                style={{ 
                  background: `linear-gradient(to right, ${currentTheme.colors.accentTertiary}, ${currentTheme.colors.accentSecondary})`,
                  color: '#fff',
                  boxShadow: `0 2px 10px ${currentTheme.colors.accentTertiary}40`
                }}
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Chat
                </div>
              </button>
            </div>
          
            {/* Features Section */}
            <div 
              className="p-4 mt-auto border-t" 
              style={{ 
                borderColor: `${currentTheme.colors.borderColor}80`,
                background: `linear-gradient(to top, ${currentTheme.colors.bgTertiary}80, transparent)`
              }}
            >
              <h4 
                className="text-sm font-medium mb-2 flex items-center"
                style={{ color: currentTheme.colors.textPrimary }}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Features
              </h4>
              
              <ul className="space-y-2 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                <li className="flex items-center p-1 rounded-md" style={{ backgroundColor: `${currentTheme.colors.accentPrimary}10` }}>
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2 p-1 flex-shrink-0"
                    style={{ 
                      backgroundColor: currentTheme.colors.accentPrimary,
                      boxShadow: `0 0 10px ${currentTheme.colors.accentPrimary}80`
                    }}
                  />
                  <span>Math equation rendering with LaTeX</span>
                </li>
                <li className="flex items-center p-1 rounded-md" style={{ backgroundColor: `${currentTheme.colors.accentSecondary}10` }}>
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2 p-1 flex-shrink-0"
                    style={{ 
                      backgroundColor: currentTheme.colors.accentSecondary,
                      boxShadow: `0 0 10px ${currentTheme.colors.accentSecondary}80` 
                    }}
                  />
                  <span>Code syntax highlighting</span>
                </li>
                <li className="flex items-center p-1 rounded-md" style={{ backgroundColor: `${currentTheme.colors.accentTertiary}10` }}>
                  <span 
                    className="inline-block w-3 h-3 rounded-full mr-2 p-1 flex-shrink-0"
                    style={{ 
                      backgroundColor: currentTheme.colors.accentTertiary,
                      boxShadow: `0 0 10px ${currentTheme.colors.accentTertiary}80`
                    }}
                  />
                  <span>Image upload for textbook help</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>
        
        {/* Main Chat Window */}
        <div 
          className="flex-grow flex flex-col h-full overflow-hidden rounded-2xl chat-container-shadow animate-fade-in"
          style={{ 
            backgroundImage: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}, ${currentTheme.colors.bgPrimary})`,
            boxShadow: `0 4px 30px rgba(0, 0, 0, 0.2), 0 0 0 1px ${currentTheme.colors.borderColor}30`,
          }}
        >
          {/* Message area */}
          <ChatWindow 
            messages={messages} 
            loading={loading}
            onRegenerate={handleRegenerate}
            onStopGeneration={handleStopGeneration}
            isGenerating={isGenerating}
          />
        
          {/* Artifact Display Panel - will show when an artifact is selected */}
          {selectedArtifact && (
            <div 
              className="p-5 border-t artifact-display"
              style={{ 
                borderColor: `${currentTheme.colors.accentPrimary}30`,
                background: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}F0, ${currentTheme.colors.bgTertiary}F0)`,
                backdropFilter: 'blur(10px)',
                boxShadow: `0 -10px 20px ${currentTheme.colors.accentPrimary}10`
              }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 
                  className="text-md font-medium flex items-center"
                  style={{ 
                    color: selectedArtifact.type === 'code' 
                      ? currentTheme.colors.accentPrimary 
                      : selectedArtifact.type === 'math' 
                        ? currentTheme.colors.accentSecondary 
                        : currentTheme.colors.accentTertiary
                  }}
                >
                  {selectedArtifact.type === 'code' && (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  )}
                  {selectedArtifact.type === 'math' && (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
                    </svg>
                  )}
                  {selectedArtifact.type === 'image' && (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {selectedArtifact.type === 'code' ? 'Code Snippet' : 
                   selectedArtifact.type === 'math' ? 'Mathematical Expression' : 'Image'}
                </h3>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="hover-grow"
                    style={{
                      borderColor: currentTheme.colors.accentPrimary,
                      color: currentTheme.colors.accentPrimary
                    }}
                    onClick={() => {/* Share logic */}}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="hover-grow"
                    onClick={() => setSelectedArtifact(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
              
              <div 
                className="rounded-xl overflow-hidden"
                style={{ 
                  boxShadow: `0 5px 20px rgba(0,0,0,0.15), 0 0 0 1px ${
                    selectedArtifact.type === 'code' 
                      ? `${currentTheme.colors.accentPrimary}20` 
                      : selectedArtifact.type === 'math' 
                        ? `${currentTheme.colors.accentSecondary}20` 
                        : `${currentTheme.colors.accentTertiary}20`
                  }`
                }}
              >
                {selectedArtifact.type === 'code' && (
                  <CodeBlock 
                    code={selectedArtifact.content}
                    language="javascript" 
                  />
                )}
                {selectedArtifact.type === 'math' && (
                  <div 
                    className="p-6 text-center"
                    style={{ 
                      backgroundColor: `${currentTheme.colors.bgPrimary}E6`,
                      borderTop: `3px solid ${currentTheme.colors.accentSecondary}50` 
                    }}
                  >
                    <MathRenderer 
                      latex={selectedArtifact.content}
                      display={true}
                    />
                  </div>
                )}
                {selectedArtifact.type === 'image' && (
                  <div className="p-4 text-center" style={{ backgroundColor: `${currentTheme.colors.bgPrimary}E6` }}>
                    <img
                      src={selectedArtifact.content}
                      alt="Shared content"
                      className="max-w-full mx-auto rounded-lg"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        
          {/* File upload area */}
          {showFileUpload && (
            <div 
              className="p-5 border-t animate-slide-up"
              style={{ 
                borderTop: `1px dashed ${currentTheme.colors.accentTertiary}50`,
                background: `linear-gradient(to top, ${currentTheme.colors.bgTertiary}90, ${currentTheme.colors.bgSecondary}90)`,
                boxShadow: `0 -4px 16px ${currentTheme.colors.accentTertiary}10`
              }}
            >
              <FileUpload
                onFileSelect={handleFileSelect}
                label="Upload an image or PDF to analyze"
              />
            </div>
          )}
          
          {/* Input area */}
          <div 
            className="p-5 border-t"
            style={{ 
              borderColor: `${currentTheme.colors.borderColor}40`,
              background: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}CC, ${currentTheme.colors.bgTertiary}CC)`,
              backdropFilter: 'blur(8px)'
            }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={showFileUpload ? "default" : "outline"}
                    className="hover-grow transition-all"
                    style={{
                      backgroundColor: showFileUpload 
                        ? `${currentTheme.colors.accentTertiary}` 
                        : 'transparent',
                      borderColor: currentTheme.colors.accentTertiary,
                      color: showFileUpload ? '#fff' : currentTheme.colors.accentTertiary,
                      boxShadow: showFileUpload 
                        ? `0 2px 10px ${currentTheme.colors.accentTertiary}40` 
                        : 'none'
                    }}
                    onClick={() => setShowFileUpload(!showFileUpload)}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {showFileUpload ? "Hide Upload" : "Attach File"}
                  </Button>
                  
                  {/* Demo Artifact Buttons */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover-grow transition-all"
                    style={{
                      borderColor: currentTheme.colors.accentPrimary,
                      color: currentTheme.colors.accentPrimary
                    }}
                    onClick={() => setSelectedArtifact({
                      type: 'code',
                      content: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}\n\nconsole.log(fibonacci(10));'
                    })}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    Code Example
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover-grow transition-all"
                    style={{
                      borderColor: currentTheme.colors.accentSecondary,
                      color: currentTheme.colors.accentSecondary
                    }}
                    onClick={() => setSelectedArtifact({
                      type: 'math',
                      content: 'f(x) = \\int_{-\\infty}^{\\infty}\\hat f(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi'
                    })}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
                    </svg>
                    Math Example
                  </Button>
                </div>
                
                {selectedFile && (
                  <div 
                    className="text-xs px-3 py-1.5 rounded-full animate-fade-in flex items-center"
                    style={{ 
                      background: `linear-gradient(to right, ${currentTheme.colors.accentTertiary}30, ${currentTheme.colors.accentPrimary}30)`,
                      color: currentTheme.colors.textPrimary,
                      border: `1px solid ${currentTheme.colors.accentTertiary}40`
                    }}
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {selectedFile.name} attached
                  </div>
                )}
              </div>
              
              <ChatInput 
                onSend={handleSendMessage} 
                disabled={loading}
                placeholder="Type your educational question..."
                isGenerating={isGenerating}
              />
              
              <div 
                className="text-xs mt-2 text-center px-3 py-1.5 rounded-lg mx-auto w-auto inline-block"
                style={{ 
                  color: currentTheme.colors.textSecondary,
                  backgroundColor: `${currentTheme.colors.bgTertiary}50`,
                  border: `1px dashed ${currentTheme.colors.borderColor}40`
                }}
              >
                <span style={{ color: currentTheme.colors.accentPrimary }}>Pro tip:</span> Try using 
                <span style={{ color: currentTheme.colors.accentSecondary }}> LaTeX equations</span> like 
                <span style={{ color: currentTheme.colors.success }}> $E=mc^2$</span> or 
                <span style={{ color: currentTheme.colors.accentTertiary }}> code snippets</span> using 
                <span style={{ color: currentTheme.colors.warning }}> ```language code blocks</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChatPage;