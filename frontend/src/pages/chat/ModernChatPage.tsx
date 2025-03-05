import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
// uuid is imported but not used - removing to clean up imports
import { createConversation, getConversation } from '../../services/chatService';
import { useLocation } from 'react-router-dom';
import { fetchApi, ApiResponse } from '../../config/api';

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
import { Conversation } from './types/chat';

const ModernChatPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
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
  
  // Mock conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  
  // Initialize conversation and load conversation history when component mounts
  useEffect(() => {
    const initConversation = async () => {
      // Verify authentication before making API calls
      if (!isAuthenticated) {
        console.warn('User not authenticated, skipping conversation initialization');
        return;
      }
      
      // First try to initialize the conversation if needed
      if (!chatState.conversationId) {
        try {
          // Create a new conversation through the chat state
          await chatState.createNewConversation();
          
          if (chatState.conversationId) {
            // Add to local state if successful
            setConversations([
              {
                id: chatState.conversationId,
                title: "New Conversation",
                date: new Date()
              }
            ]);
          }
        } catch (error) {
          console.error('Error creating new conversation:', error);
        }
      }
      
      // Then try to load all conversations from the server
      try {
        // Define the type of conversation data we expect from the API
        interface ConversationResponse {
          conversation_id: string;
          title?: string;
          created_at: string;
        }
        
        const response = await fetchApi<ConversationResponse[]>('/api/chat/conversations', {
          method: 'GET'
        });
        
        if (!response.success || !response.data) {
          throw new Error(response.error || 'Failed to load conversations');
        }
        
        const conversationsData = response.data;
        
        // Convert to UI format
        const fetchedConversations = conversationsData.map((conv: ConversationResponse) => ({
          id: conv.conversation_id,
          title: conv.title || "Untitled Conversation",
          date: new Date(conv.created_at)
        }));
        
        setConversations(fetchedConversations);
      } catch (err) {
        console.error('Error loading conversations:', err);
        // If we can't load conversations but have a current one, show just that
        if (chatState.conversationId) {
          setConversations([{
            id: chatState.conversationId,
            title: "Current Conversation",
            date: new Date()
          }]);
        }
      }
    };
    
    initConversation();
    
    // Animations should be in CSS files rather than injected via JS
    // This is a temporary measure until animations are moved to proper CSS files
    
    return () => {
      // Cleanup function
    };
  }, [isAuthenticated, chatState.conversationId, chatState.createNewConversation]);

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
        conversations={conversations}
        currentConversationId={chatState.conversationId}
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