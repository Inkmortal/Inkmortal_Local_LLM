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
    // Skip if not authenticated
    if (!isAuthenticated) {
      return;
    }
    
    // Skip if already initialized and using the same conversation ID
    if (hasInitializedRef.current && chatState.conversationId === conversationId) {
      console.log('Component already initialized with the correct conversation');
      return;
    }
    
    const initConversation = async () => {
      console.log('Initializing chat page');
      
      try {
        // First, always load the conversation list
        await chatState.loadConversations();
        
        // Handle specific cases
        if (conversationId) {
          // For existing conversation ID from URL, check if it exists in our list
          const conversationExists = chatState.conversations.some(
            conv => conv.id === conversationId
          );
          
          if (conversationExists) {
            console.log(`Loading existing conversation: ${conversationId}`);
            await chatState.loadConversation(conversationId);
          } else {
            console.log(`Conversation ${conversationId} from URL not found, starting new chat`);
            chatState.startNewConversation();
            // Update URL to remove the invalid conversation ID
            navigate('/chat', { replace: true });
          }
        } 
        else if (chatState.conversationId) {
          // Already have an active conversation, no need to do anything
          console.log(`Using existing conversation: ${chatState.conversationId}`);
        }
        else {
          // No conversation ID in URL and no active conversation
          // Just show empty chat interface, DON'T create a conversation yet
          console.log('Starting with empty chat interface');
          chatState.startNewConversation(); // This just resets UI state, doesn't create a backend conversation
        }
        
        hasInitializedRef.current = true;
      } catch (error) {
        console.error('Error initializing chat page:', error);
        // In case of error, reset to empty state
        chatState.startNewConversation();
        hasInitializedRef.current = true;
      }
    };
    
    // Run initialization
    initConversation();
    
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