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
  const [showSidebar, setShowSidebar] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  
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
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05);
        transition: all 0.5s ease;
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
        width: 5px;
      }
      
      .modern-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .modern-scrollbar::-webkit-scrollbar-thumb {
        background-color: rgba(155, 155, 155, 0.3);
        border-radius: 20px;
      }
      
      .modern-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: rgba(155, 155, 155, 0.5);
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

  // Toggle function for the chat info sidebar
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Toggle function for the history sidebar
  const toggleHistorySidebar = () => {
    setShowHistorySidebar(!showHistorySidebar);
  };

  const handleInsertCode = () => {
    // For demo, add a code snippet template to the input
    const codeSnippet = `\`\`\`javascript
function example() {
  // Your code here
  return true;
}
\`\`\``;
    
    // In a real implementation, this would be inserted at cursor position in the ChatInput
    console.log("Insert code:", codeSnippet);
  };

  const handleInsertMath = () => {
    // For demo, add a LaTeX math template to the input
    const mathSnippet = `$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`;
    
    // In a real implementation, this would be inserted at cursor position in the ChatInput
    console.log("Insert math:", mathSnippet);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
      {/* Left Sidebar - Conversation History */}
      <aside 
        className={`flex-shrink-0 h-full transition-all ${showHistorySidebar ? 'w-64' : 'w-0 overflow-hidden'}`}
        style={{ 
          background: `linear-gradient(165deg, ${currentTheme.colors.bgSecondary}95, ${currentTheme.colors.bgTertiary}95)`,
          backdropFilter: 'blur(10px)',
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.07), 0 0 0 1px ${currentTheme.colors.borderColor}30`,
          borderRight: `1px solid ${currentTheme.colors.borderColor}30`,
          zIndex: 20,
          transition: 'all 0.3s ease',
        }}
      >
        {/* Conversation History Section */}
        <div className="flex flex-col h-full">
          <div 
            className="px-4 py-3 border-b flex justify-between items-center"
            style={{ 
              borderColor: `${currentTheme.colors.borderColor}40`,
              background: `linear-gradient(90deg, ${currentTheme.colors.accentPrimary}10, transparent)`,
            }}
          >
            <h3 
              className="text-base font-medium flex items-center"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              <svg className="w-4 h-4 mr-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Recent Chats
            </h3>
            <Button
              size="xs"
              variant="ghost"
              className="rounded-full p-1.5"
              style={{
                color: currentTheme.colors.textSecondary
              }}
              onClick={toggleHistorySidebar}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </Button>
          </div>
          
          {/* New chat button - moved to top for better visibility */}
          <button 
            className="w-[calc(100%-1rem)] mx-auto mt-3 p-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center"
            style={{ 
              background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}20, ${currentTheme.colors.accentSecondary}20)`,
              color: currentTheme.colors.textSecondary,
              border: `1px solid ${currentTheme.colors.borderColor}40`,
            }}
          >
            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Conversation
          </button>
          
          <div className="p-2 space-y-1.5 overflow-y-auto modern-scrollbar flex-grow">
            {/* Conversations list */}
            {conversations.map((conv, index) => (
              <div 
                key={conv.id}
                className="p-2.5 rounded-lg cursor-pointer transition-all relative overflow-hidden group"
                style={{ 
                  backgroundColor: conv.id === conversationId 
                    ? `${currentTheme.colors.accentPrimary}15` 
                    : 'transparent',
                  borderLeft: conv.id === conversationId 
                    ? `2px solid ${currentTheme.colors.accentPrimary}` 
                    : `2px solid transparent`,
                }}
                onClick={() => {/* Load conversation */}}
              >
                <h4 
                  className="text-sm font-medium mb-1 flex items-center"
                  style={{ 
                    color: conv.id === conversationId 
                      ? currentTheme.colors.textPrimary
                      : currentTheme.colors.textSecondary
                  }}
                >
                  {index === 0 ? (
                    <>
                      <span className="relative flex h-2 w-2 mr-2">
                        <span 
                          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                          style={{ backgroundColor: currentTheme.colors.success }}
                        />
                        <span 
                          className="relative inline-flex rounded-full h-2 w-2" 
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
                  style={{ color: currentTheme.colors.textMuted }}
                >
                  {index === 0 
                    ? 'Active conversation' 
                    : `Started on ${conv.date.toLocaleDateString()}`}
                </p>
              </div>
            ))}
          </div>
        
          {/* Features Section */}
          <div 
            className="px-4 py-3 mt-auto border-t" 
            style={{ 
              borderColor: `${currentTheme.colors.borderColor}40`,
              background: `linear-gradient(to bottom, transparent, ${currentTheme.colors.bgTertiary}40)`,
            }}
          >
            <h4 
              className="text-xs uppercase tracking-wider font-medium mb-2 opacity-70"
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Capabilities
            </h4>
            
            <div className="space-y-1.5 text-xs" style={{ color: currentTheme.colors.textSecondary }}>
              <div className="flex items-center gap-1.5">
                <span 
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentTheme.colors.accentPrimary }}
                />
                <span>Mathematical expression rendering</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span 
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentTheme.colors.accentSecondary }}
                />
                <span>Code syntax highlighting & execution</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span 
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentTheme.colors.accentTertiary }}
                />
                <span>Document uploading & analysis</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area - This is the flex-grow section that fills the space */}
      <div className="flex flex-col flex-grow overflow-hidden relative">
        {/* Modern Glass Header */}
        <header 
          className="py-3 px-4 md:px-6 flex justify-between items-center z-10 sticky top-0"
          style={{ 
            background: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}AA, ${currentTheme.colors.bgPrimary}90)`,
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${currentTheme.colors.borderColor}30`,
            boxShadow: `0 4px 16px rgba(0, 0, 0, 0.08)`,
          }}
        >
          <div className="flex items-center space-x-3">
            {/* Toggle History Sidebar Button (only shows when sidebar is closed) */}
            {!showHistorySidebar && (
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full p-1.5"
                style={{
                  color: currentTheme.colors.textSecondary
                }}
                onClick={toggleHistorySidebar}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </Button>
            )}
            
            <div className="relative group">
              <div 
                className="absolute -inset-1 rounded-full opacity-40 group-hover:opacity-70 transition-all blur-sm"
                style={{ 
                  background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                  filter: 'blur(6px)'
                }}
              />
              <div className="relative p-2 rounded-full"
                style={{ 
                  background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                }}
              >
                <svg 
                  className="w-6 h-6" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: '#fff' }}
                >
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M12 11l3 3m0 0l-3 3m3-3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-baseline">
                <span 
                  className="text-lg font-semibold" 
                  style={{ 
                    background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  SeaDragon
                </span>
                <span className="ml-1.5 text-sm font-medium" style={{ color: currentTheme.colors.textPrimary }}>
                  Chat
                </span>
              </div>
              <div className="text-xs font-light" style={{ color: currentTheme.colors.textMuted }}>
                Powered by Artificial Intelligence
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* New conversation button */}
            <Button 
              size="sm"
              variant="outline"
              className="text-sm rounded-lg"
              style={{
                color: currentTheme.colors.textSecondary,
                borderColor: `${currentTheme.colors.borderColor}60`,
              }}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Chat
            </Button>

            {/* Artifact Panel button */}
            <Button 
              size="sm"
              variant="ghost"
              className="text-sm rounded-lg"
              style={{
                color: showSidebar ? currentTheme.colors.accentPrimary : currentTheme.colors.textSecondary,
                backgroundColor: showSidebar ? `${currentTheme.colors.accentPrimary}10` : 'transparent',
              }}
              onClick={toggleSidebar}
              title="View artifacts and uploads"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </Button>
            
            {isAuthenticated && (
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => window.navigateTo('/admin')}
                className="text-sm transition-all rounded-lg"
                style={{
                  color: currentTheme.colors.textSecondary,
                  background: `${currentTheme.colors.bgTertiary}60`,
                }}
              >
                Admin
              </Button>
            )}
            <ThemeSelector />
          </div>
        </header>
        
        {/* Main Chat Interface */}
        <div className="flex flex-grow overflow-hidden relative">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Gradient sphere 1 */}
            <div 
              className="absolute rounded-full opacity-15 blur-3xl" 
              style={{
                width: '40vw',
                height: '40vw',
                top: '20%',
                left: '-10%',
                background: `radial-gradient(circle, ${currentTheme.colors.accentPrimary}40, transparent 70%)`,
                filter: 'blur(120px)',
              }}
            />
            
            {/* Gradient sphere 2 */}
            <div 
              className="absolute rounded-full opacity-10 blur-3xl" 
              style={{
                width: '45vw',
                height: '45vw',
                bottom: '-10%',
                right: '-5%',
                background: `radial-gradient(circle, ${currentTheme.colors.accentSecondary}30, transparent 70%)`,
                filter: 'blur(120px)',
              }}
            />
          </div>
          
          {/* Content container */}
          <div className="w-full h-full flex relative">
            {/* Main Chat Window - No border or background to blend with page */}
            <div className="flex-grow flex flex-col overflow-hidden">
              {/* Message area */}
              <ChatWindow 
                messages={messages} 
                loading={loading}
                onRegenerate={handleRegenerate}
                onStopGeneration={handleStopGeneration}
                isGenerating={isGenerating}
              />
            
              {/* File upload area */}
              {showFileUpload && (
                <div 
                  className="px-5 py-4 animate-slideUp"
                  style={{ 
                    background: `linear-gradient(to top, ${currentTheme.colors.bgSecondary}90, ${currentTheme.colors.bgTertiary}90)`,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    label="Upload an image or PDF to analyze"
                  />
                </div>
              )}
              
              {/* Action bar - with useful buttons */}
              <div 
                className="px-4 py-2 flex items-center justify-between"
                style={{ 
                  background: 'transparent',
                }}
              >
                <div className="flex items-center gap-1.5">
                  {/* File Upload Button */}
                  <Button
                    size="xs"
                    variant={showFileUpload ? "default" : "ghost"}
                    className="rounded-full p-1.5 transition-all"
                    style={{
                      color: showFileUpload 
                        ? '#fff'
                        : currentTheme.colors.textSecondary,
                      backgroundColor: showFileUpload 
                        ? currentTheme.colors.accentTertiary
                        : `${currentTheme.colors.bgTertiary}40`,
                    }}
                    title={showFileUpload ? "Hide file upload" : "Attach file"}
                    onClick={() => setShowFileUpload(!showFileUpload)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </Button>
                  
                  {/* Code Snippet Button */}
                  <Button
                    size="xs"
                    variant="ghost"
                    className="rounded-full p-1.5 transition-all"
                    style={{
                      color: currentTheme.colors.textSecondary,
                      backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                    }}
                    title="Insert code snippet"
                    onClick={handleInsertCode}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </Button>
                  
                  {/* Math Expression Button */}
                  <Button
                    size="xs"
                    variant="ghost"
                    className="rounded-full p-1.5 transition-all"
                    style={{
                      color: currentTheme.colors.textSecondary,
                      backgroundColor: `${currentTheme.colors.bgTertiary}40`,
                    }}
                    title="Insert math expression"
                    onClick={handleInsertMath}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
                    </svg>
                  </Button>
                  
                  {selectedFile && (
                    <div 
                      className="text-xs px-2 py-1 rounded-full animate-fade-in flex items-center ml-1"
                      style={{ 
                        backgroundColor: `${currentTheme.colors.accentTertiary}15`,
                        color: currentTheme.colors.textSecondary,
                        border: `1px solid ${currentTheme.colors.accentTertiary}30`
                      }}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {selectedFile.name}
                      <button 
                        className="ml-1.5 hover:text-red-500 transition-colors"
                        onClick={() => setSelectedFile(null)}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center">
                  <div 
                    className="text-xs mr-2 select-none"
                    style={{ color: currentTheme.colors.textMuted }}
                  >
                    <span className="hidden sm:inline">Press </span>
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mx-0.5"
                      style={{
                        backgroundColor: `${currentTheme.colors.bgTertiary}80`,
                        color: currentTheme.colors.textSecondary,
                        border: `1px solid ${currentTheme.colors.borderColor}40`,
                      }}
                    >
                      Shift
                    </kbd>
                    <span className="hidden sm:inline-block mx-0.5">+</span>
                    <kbd className="px-1.5 py-0.5 rounded text-[10px] font-medium mx-0.5"
                      style={{
                        backgroundColor: `${currentTheme.colors.bgTertiary}80`,
                        color: currentTheme.colors.textSecondary,
                        border: `1px solid ${currentTheme.colors.borderColor}40`,
                      }}
                    >
                      ↵
                    </kbd>
                    <span className="hidden sm:inline"> for line break</span>
                  </div>
                </div>
              </div>
              
              {/* Chat input - styled like Claude with no background */}
              <div className="px-4 py-3 relative">
                <div className="mx-auto max-w-4xl rounded-2xl overflow-hidden"
                  style={{
                    boxShadow: `0 4px 20px rgba(0, 0, 0, 0.08)`,
                    border: `1px solid ${currentTheme.colors.borderColor}40`,
                  }}
                >
                  <ChatInput 
                    onSend={handleSendMessage} 
                    disabled={loading}
                    placeholder="Message SeaDragon..."
                    isGenerating={isGenerating}
                  />
                </div>
              </div>
            </div>
            
            {/* Right Sidebar - Artifacts Panel */}
            <aside 
              className={`transition-all ${showSidebar ? 'w-80' : 'w-0 overflow-hidden'} h-full`}
              style={{ 
                background: `linear-gradient(165deg, ${currentTheme.colors.bgSecondary}95, ${currentTheme.colors.bgTertiary}95)`,
                backdropFilter: 'blur(10px)',
                boxShadow: `0 4px 20px rgba(0, 0, 0, 0.07), 0 0 0 1px ${currentTheme.colors.borderColor}30`,
                borderLeft: `1px solid ${currentTheme.colors.borderColor}30`,
                transition: 'all 0.3s ease',
                zIndex: 20
              }}
            >
              <div className="flex flex-col h-full">
                <div 
                  className="px-4 py-3 border-b flex justify-between items-center"
                  style={{ 
                    borderColor: `${currentTheme.colors.borderColor}40`,
                    background: `linear-gradient(90deg, ${currentTheme.colors.accentSecondary}10, transparent)`,
                  }}
                >
                  <h3 
                    className="text-base font-medium flex items-center"
                    style={{ color: currentTheme.colors.textPrimary }}
                  >
                    <svg className="w-4 h-4 mr-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Artifacts
                  </h3>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="rounded-full p-1.5"
                    style={{
                      color: currentTheme.colors.textSecondary
                    }}
                    onClick={toggleSidebar}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
                
                <div className="p-4 overflow-y-auto modern-scrollbar flex-grow">
                  {/* Uploaded Files Section */}
                  <div className="mb-6">
                    <h4 
                      className="text-sm font-medium mb-2 flex items-center"
                      style={{ color: currentTheme.colors.textPrimary }}
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Uploaded Files
                    </h4>
                    
                    {selectedFile ? (
                      <div 
                        className="p-3 rounded-xl mb-2 flex items-center"
                        style={{ 
                          backgroundColor: `${currentTheme.colors.bgPrimary}80`,
                          border: `1px solid ${currentTheme.colors.borderColor}30`
                        }}
                      >
                        <svg className="w-6 h-6 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                          style={{ color: currentTheme.colors.accentTertiary }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div className="overflow-hidden flex-grow">
                          <div className="text-sm font-medium truncate" style={{ color: currentTheme.colors.textPrimary }}>
                            {selectedFile.name}
                          </div>
                          <div className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="text-sm italic"
                        style={{ color: currentTheme.colors.textMuted }}
                      >
                        No files uploaded in this chat
                      </div>
                    )}
                  </div>
                  
                  {/* Generated Artifacts Section */}
                  <div>
                    <h4 
                      className="text-sm font-medium mb-2 flex items-center"
                      style={{ color: currentTheme.colors.textPrimary }}
                    >
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      Generated Artifacts
                    </h4>
                    
                    <div className="space-y-2">
                      {/* Code artifact example */}
                      <div 
                        className="p-3 rounded-xl cursor-pointer hover:scale-[1.01] transition-all"
                        style={{ 
                          backgroundColor: `${currentTheme.colors.bgPrimary}80`,
                          border: `1px solid ${currentTheme.colors.borderColor}30`
                        }}
                        onClick={() => setSelectedArtifact({
                          type: 'code',
                          content: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}\n\nconsole.log(fibonacci(10));'
                        })}
                      >
                        <div className="flex items-center mb-2">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                            style={{ color: currentTheme.colors.accentPrimary }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          <span className="text-sm font-medium" style={{ color: currentTheme.colors.textPrimary }}>Fibonacci Function</span>
                        </div>
                        <div 
                          className="text-xs rounded-lg p-2 overflow-hidden max-h-20"
                          style={{ 
                            backgroundColor: `${currentTheme.colors.bgTertiary}50`,
                            color: currentTheme.colors.textSecondary,
                            fontFamily: 'monospace'
                          }}
                        >
                          {"function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + ..."}
                        </div>
                      </div>
                      
                      {/* Math artifact example */}
                      <div 
                        className="p-3 rounded-xl cursor-pointer hover:scale-[1.01] transition-all"
                        style={{ 
                          backgroundColor: `${currentTheme.colors.bgPrimary}80`,
                          border: `1px solid ${currentTheme.colors.borderColor}30`
                        }}
                        onClick={() => setSelectedArtifact({
                          type: 'math',
                          content: 'f(x) = \\int_{-\\infty}^{\\infty}\\hat f(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi'
                        })}
                      >
                        <div className="flex items-center mb-2">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
                            style={{ color: currentTheme.colors.accentSecondary }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
                          </svg>
                          <span className="text-sm font-medium" style={{ color: currentTheme.colors.textPrimary }}>Fourier Transform</span>
                        </div>
                        <div 
                          className="text-xs rounded-lg p-2 flex items-center justify-center"
                          style={{ 
                            backgroundColor: `${currentTheme.colors.bgTertiary}50`,
                            color: currentTheme.colors.textSecondary,
                            fontFamily: 'serif',
                            fontStyle: 'italic'
                          }}
                        >
                          f(x) = ∫ f̂(ξ)e²ᵖⁱᵏˣdξ
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Selected Artifact Display */}
                  {selectedArtifact && (
                    <div 
                      className="mt-6 p-4 border-t artifact-display"
                      style={{ 
                        borderColor: `${currentTheme.colors.borderColor}30`,
                      }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h3 
                          className="text-sm font-medium flex items-center"
                          style={{ 
                            color: selectedArtifact.type === 'code' 
                              ? currentTheme.colors.accentPrimary 
                              : selectedArtifact.type === 'math' 
                                ? currentTheme.colors.accentSecondary 
                                : currentTheme.colors.accentTertiary
                          }}
                        >
                          {selectedArtifact.type === 'code' && (
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                          )}
                          {selectedArtifact.type === 'math' && (
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m1-7h-.08a2 2 0 00-1.519.698L9.6 15.302A2 2 0 018.08 16H8" />
                            </svg>
                          )}
                          {selectedArtifact.type === 'image' && (
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                          {selectedArtifact.type === 'code' ? 'Code Snippet' : 
                          selectedArtifact.type === 'math' ? 'Mathematical Expression' : 'Image'}
                        </h3>
                        
                        <div className="flex space-x-2">
                          <Button 
                            size="xs" 
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: currentTheme.colors.borderColor,
                              color: currentTheme.colors.textSecondary
                            }}
                            onClick={() => setSelectedArtifact(null)}
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Close
                          </Button>
                        </div>
                      </div>
                      
                      <div 
                        className="rounded-lg overflow-hidden"
                        style={{ 
                          boxShadow: `0 2px 10px rgba(0,0,0,0.08), 0 0 0 1px ${currentTheme.colors.borderColor}30`,
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
                            className="p-5 text-center"
                            style={{ 
                              backgroundColor: `${currentTheme.colors.bgPrimary}E6`,
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
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChatPage;