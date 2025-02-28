import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { MockChatService } from '../../services/chatService';

// Import components
import ChatHeader from './components/layout/ChatHeader';
import ChatBackgroundEffects from './components/layout/ChatBackgroundEffects';
import ChatContainer from './components/chat/ChatContainer';
import HistorySidebar from './components/sidebars/HistorySidebar/HistorySidebar';
import CodeEditor from '../../components/chat/editors/CodeEditor';
import MathExpressionEditor from '../../components/chat/editors/MathExpressionEditor';

// Import hooks
import useChatState from './hooks/useChatState';
import { Conversation } from './types/chat';

const ModernChatPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  
  // Chat state management
  const chatState = useChatState();
  
  // Modal state
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [mathEditorOpen, setMathEditorOpen] = useState(false);
  
  // UI state
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Mock conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Initialize conversation when component mounts
  useEffect(() => {
    const initConversation = async () => {
      try {
        const { conversation_id } = await MockChatService.createConversation();
        
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
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      .message-fade-in {
        animation: fadeUp 0.5s ease forwards;
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
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Sidebar toggles
  const toggleHistorySidebar = () => {
    setShowHistorySidebar(!showHistorySidebar);
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
      {/* Left Sidebar - Conversation History */}
      <HistorySidebar 
        showHistorySidebar={showHistorySidebar}
        toggleHistorySidebar={toggleHistorySidebar}
        conversations={conversations}
        currentConversationId={chatState.conversationId}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-grow overflow-hidden relative">
        {/* Header */}
        <ChatHeader 
          showHistorySidebar={showHistorySidebar}
          toggleHistorySidebar={toggleHistorySidebar}
          toggleSidebar={toggleSidebar}
          showSidebar={showSidebar}
          isAuthenticated={isAuthenticated}
        />
        
        {/* Main Chat Interface */}
        <div className="flex flex-grow overflow-hidden relative">
          {/* Background effects */}
          <ChatBackgroundEffects />
          
          {/* Content container */}
          <div className="w-full h-full flex relative">
            {/* Main Chat Window */}
            <ChatContainer 
              messages={chatState.messages}
              loading={chatState.loading}
              isGenerating={chatState.isGenerating}
              onSendMessage={chatState.handleSendMessage}
              onRegenerate={chatState.handleRegenerate}
              onStopGeneration={chatState.handleStopGeneration}
              showFileUpload={chatState.showFileUpload}
              setShowFileUpload={chatState.setShowFileUpload}
              selectedFile={chatState.selectedFile}
              setSelectedFile={chatState.setSelectedFile}
              handleFileSelect={chatState.handleFileSelect}
              handleInsertCode={chatState.handleInsertCode}
              handleInsertMath={chatState.handleInsertMath}
              codeInsertRef={chatState.codeInsertRef}
              mathInsertRef={chatState.mathInsertRef}
            />
            
            {/* Right Sidebar - Artifacts Panel (to be implemented) */}
            {showSidebar && (
              <aside 
                className="transition-all w-80 h-full"
                style={{ 
                  background: `linear-gradient(165deg, ${currentTheme.colors.bgSecondary}95, ${currentTheme.colors.bgTertiary}95)`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: `0 4px 20px rgba(0, 0, 0, 0.07), 0 0 0 1px ${currentTheme.colors.borderColor}30`,
                  borderLeft: `1px solid ${currentTheme.colors.borderColor}30`,
                  transition: 'all 0.3s ease',
                  zIndex: 20
                }}
              >
                {/* Placeholder for ArtifactsSidebar component */}
                <div className="p-4">
                  <h3>Artifacts Sidebar</h3>
                  <p>To be implemented as a separate component</p>
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChatPage;