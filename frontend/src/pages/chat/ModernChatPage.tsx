import React, { useState, useEffect, useRef } from 'react';
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
  
  // Using a ref to track initialization state to prevent multiple initializations
  const hasInitializedRef = useRef(false);
  
  // Initialize conversation only once when component mounts
  useEffect(() => {
    // Skip if not authenticated or already initialized
    if (!isAuthenticated || hasInitializedRef.current) {
      return;
    }
    
    const initConversation = async () => {
      console.log('Initializing conversation once');
      hasInitializedRef.current = true;
      
      try {
        // For existing conversation ID from URL
        if (conversationId) {
          await chatState.loadConversation(conversationId);
        } 
        // For a new session without conversation ID
        else if (!chatState.conversationId) {
          await chatState.createNewConversation();
        }
        
        // Load conversations list just once
        chatState.loadConversations();
      } catch (error) {
        console.error('Error initializing conversation:', error);
        hasInitializedRef.current = false; // Reset on error to allow retry
      }
    };
    
    // Run initialization only once
    initConversation();
    
    // Only recreate this effect if authentication state changes
  }, [isAuthenticated, conversationId, chatState]);

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
        onConversationDeleted={chatState.loadConversations}
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
              codeInsertRef={chatState.codeInsertRef}
              mathInsertRef={chatState.mathInsertRef}
              handleInsertCode={chatState.handleInsertCode}
              handleInsertMath={chatState.handleInsertMath}
              isQueueLoading={chatState.isQueueLoading}
              isProcessing={chatState.isProcessing}
              queuePosition={chatState.queuePosition}
            />
            
            {/* Right Sidebar - Artifacts/Documents */}
            <ArtifactsSidebar
              showSidebar={showArtifactsSidebar}
              toggleSidebar={toggleArtifactsSidebar}
              onArtifactSelect={handleArtifactSelect}
              onDocumentSelect={handleDocumentSelect}
            />
          </div>
        </div>
      </div>
      
      {/* Artifact Canvas (overlay) */}
      {showArtifactCanvas && (
        <ArtifactCanvas
          artifact={selectedArtifact}
          document={selectedDocument}
          onClose={handleCloseArtifactCanvas}
        />
      )}
    </div>
  );
};

export default ModernChatPage;