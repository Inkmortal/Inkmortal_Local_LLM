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
  // Track initialization attempts to prevent infinite retries
  const initAttemptsRef = useRef(0);
  
  // Initialize conversation only once when component mounts
  useEffect(() => {
    // Skip if not authenticated
    if (!isAuthenticated) {
      return;
    }
    
    // Limit initialization attempts to prevent infinite loops (max 3 attempts)
    if (initAttemptsRef.current >= 3) {
      console.warn('Maximum initialization attempts reached, giving up');
      return;
    }
    
    // Skip if already initialized and using the same conversation ID
    if (hasInitializedRef.current && chatState.conversationId === conversationId) {
      console.log('Component already initialized with the correct conversation');
      return;
    }
    
    const initConversation = async () => {
      console.log(`Initializing conversation (attempt ${initAttemptsRef.current + 1})`);
      initAttemptsRef.current += 1;
      
      try {
        // First, always load the conversation list
        await chatState.loadConversations();
        
        // Then handle specific cases
        if (conversationId) {
          // For existing conversation ID from URL
          console.log(`Loading existing conversation: ${conversationId}`);
          
          // First check if this conversation exists in our list
          const conversationExists = chatState.conversations.some(
            conv => conv.id === conversationId
          );
          
          if (conversationExists) {
            console.log(`Conversation ${conversationId} found in conversation list`);
          } else {
            console.log(`Conversation ${conversationId} not found in list, might need to be created`);
          }
          
          // Use loadConversation which handles not-found gracefully
          await chatState.loadConversation(conversationId);
          hasInitializedRef.current = true;
        } 
        else if (!chatState.conversationId) {
          // No conversation, create a new one exactly once
          console.log('No active conversation, creating a new one');
          await chatState.startNewConversation();
          hasInitializedRef.current = true;
        }
        else {
          // We already have a conversation, no need to create a new one
          console.log(`Using existing conversation: ${chatState.conversationId}`);
          hasInitializedRef.current = true;
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        // Don't reset hasInitializedRef on error to prevent endless retry loops
        
        // If the error was with a conversation from URL, start a new one
        if (conversationId && initAttemptsRef.current >= 2) {
          console.log('Error with URL conversation, starting new conversation instead');
          try {
            await chatState.startNewConversation();
            // Update URL to remove the problematic conversation ID
            navigate('/chat', { replace: true });
            hasInitializedRef.current = true;
          } catch (newError) {
            console.error('Error creating new conversation after failed load:', newError);
          }
        }
      }
    };
    
    // Run initialization
    initConversation();
    
    // Clean up on unmount by resetting initAttemptsRef
    return () => {
      initAttemptsRef.current = 0;
    };
    
  }, [isAuthenticated, conversationId, chatState, navigate]);

  // Handler for selecting a conversation
  const handleSelectConversation = (conversationId: string) => {
    try {
      // Update URL to include conversation ID
      navigate(`/chat?conversation=${conversationId}`, { replace: true });
      // Load conversation data
      chatState.loadConversation(conversationId);
    } catch (error) {
      console.error('Error selecting conversation:', error);
    }
  };

  // Handler for creating a new conversation
  const handleNewConversation = async () => {
    try {
      await chatState.startNewConversation();
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
        isLoading={chatState.isNetworkLoading}
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
              loading={chatState.isLoading || chatState.isNetworkLoading}
              isGenerating={chatState.isGenerating}
              onSendMessage={chatState.sendMessage}
              onRegenerate={(id) => chatState.regenerateLastMessage()}
              onStopGeneration={chatState.stopGeneration}
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