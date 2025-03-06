import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

// Import styles
import '../../styles/enhanced-animations.css';
import '../../styles/animations.css';

// Import components
import ChatHeader from './components/layout/ChatHeader';
import ChatBackgroundEffects from './components/layout/ChatBackgroundEffects';
import ChatContainer from './components/chat/ChatContainer';
import HistorySidebar from './components/sidebars/HistorySidebar/HistorySidebar';
// Import a single instance of ArtifactsSidebar to avoid duplication
import ArtifactsSidebar, { Artifact, UploadedDocument } from '../../components/artifacts/ArtifactsSidebar';
import ArtifactCanvas from '../../components/artifacts/ArtifactCanvas';

// Import hooks
import useChatState from './hooks/useChatState';

const ModernChatPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extract conversation ID from URL query parameters
  const getConversationIdFromUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('conversation') || undefined;
  };
  
  // Chat state management - pass conversation ID from URL
  const conversationId = getConversationIdFromUrl();
  const chatState = useChatState({ initialConversationId: conversationId });
  
  // UI state
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [showArtifactsSidebar, setShowArtifactsSidebar] = useState(false);
  
  // Artifacts state
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | undefined>(undefined);
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | undefined>(undefined);
  const [showArtifactCanvas, setShowArtifactCanvas] = useState(false);
  
  // Initialize conversation and load conversation history when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const initConversation = async () => {
      // Verify authentication before making API calls
      if (!isAuthenticated) {
        console.warn('User not authenticated, skipping conversation initialization');
        return;
      }
      
      // First try to initialize the conversation if needed
      if (!chatState.conversationId && isMounted) {
        try {
          // Create a new conversation through the chat state
          await chatState.createNewConversation();
        } catch (error) {
          if (isMounted) {
            console.error('Error creating new conversation:', error);
          }
        }
      }
      
      // Load all conversations from the server
      if (isMounted) {
        chatState.loadConversations();
      }
    };
    
    initConversation();
    
    return () => {
      // Cleanup function to prevent state updates after unmounting
      isMounted = false;
    };
  }, [isAuthenticated, chatState.conversationId, chatState.createNewConversation, chatState.loadConversations]);

  // Handler for selecting a conversation
  const handleSelectConversation = (conversationId: string) => {
    try {
      // Update URL to include conversation ID
      navigate(`/chat?conversation=${conversationId}`, { replace: true });
      // Load conversation data
      chatState.switchConversation(conversationId);
    } catch (error) {
      console.error('Error selecting conversation:', error);
    }
  };

  // Handler for creating a new conversation
  const handleNewConversation = async () => {
    try {
      await chatState.createNewConversation();
      // Update URL to remove conversation query param for new conversation
      navigate('/chat', { replace: true });
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  // Sidebar toggles
  const toggleHistorySidebar = () => {
    setShowHistorySidebar(!showHistorySidebar);
  };

  const toggleArtifactsSidebar = () => {
    setShowArtifactsSidebar(!showArtifactsSidebar);
    // Close artifact canvas when closing sidebar
    if (showArtifactsSidebar) {
      setShowArtifactCanvas(false);
    }
  };

  // Artifact handlers
  const handleArtifactSelect = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setSelectedDocument(undefined);
    setShowArtifactCanvas(true);
  };

  const handleDocumentSelect = (document: UploadedDocument) => {
    setSelectedDocument(document);
    setSelectedArtifact(undefined);
    setShowArtifactCanvas(true);
  };

  const handleCloseArtifactCanvas = () => {
    setShowArtifactCanvas(false);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
      {/* Left Sidebar - Conversation History */}
      <HistorySidebar 
        showHistorySidebar={showHistorySidebar}
        toggleHistorySidebar={toggleHistorySidebar}
        conversations={chatState.conversations}
        currentConversationId={chatState.conversationId}
        onConversationSelect={handleSelectConversation}
        onNewConversation={handleNewConversation}
        isLoading={chatState.conversationLoading}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-grow overflow-hidden relative">
        {/* Header */}
        <ChatHeader 
          showHistorySidebar={showHistorySidebar}
          toggleHistorySidebar={toggleHistorySidebar}
          toggleSidebar={toggleArtifactsSidebar}
          showSidebar={showArtifactsSidebar}
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
            
            {/* Artifacts Sidebar */}
            <ArtifactsSidebar 
              isOpen={showArtifactsSidebar}
              onClose={toggleArtifactsSidebar}
              onArtifactSelect={handleArtifactSelect}
              onDocumentSelect={handleDocumentSelect}
            />

            {/* Artifact Canvas for detailed view */}
            <ArtifactCanvas 
              artifact={selectedArtifact}
              document={selectedDocument}
              isOpen={showArtifactCanvas}
              onClose={handleCloseArtifactCanvas}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernChatPage;