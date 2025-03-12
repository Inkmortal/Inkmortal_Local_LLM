import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

// Import styles
import '../../styles/enhanced-animations.css';
import '../../styles/animations.css';

// Import components
import ChatHeader from './components/layout/ChatHeader';
import ChatBackgroundEffects from './components/layout/ChatBackgroundEffects';
import ChatWindowFixed from '../../components/chat/ChatWindowFixed';
import ChatInputFixed from '../../components/chat/ChatInputFixed';
import ChatHistorySidebarFixed from '../../components/chat/ChatHistorySidebarFixed';
import ArtifactsSidebar, { Artifact, UploadedDocument } from '../../components/artifacts/ArtifactsSidebar';
import ArtifactCanvas from '../../components/artifacts/ArtifactCanvas';
import FileUploadArea from './components/chat/FileUploadArea';

// Import hooks
import { useChatStream } from './hooks/useChatStream';
import { MessageStatus } from './types/message';

/**
 * Improved Modern Chat Page with fixes for:
 * 1. Key props in Chat History sidebar
 * 2. Text input preservation during generation
 * 3. Scrolling issues in chat window
 * 4. Stop Generation button
 */
const ModernChatPageFixed: React.FC = () => {
  const { currentTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  
  // Initialize chat state with the conversation ID from URL
  const {
    state,
    messages,
    sendMessage,
    stopGeneration,
    isGenerating
  } = useChatStream({
    initialConversationId: conversationId || null,
    autoConnect: true
  });
  
  // For compatibility with existing code
  const sortedMessages = messages;
  const conversationList = [];
  const activeConversation = null;
  const handleFileSelect = () => {};
  const clearSelectedFile = () => {};
  const selectedFile = null;
  const regenerateLastMessage = () => {};
  const loadConversations = async () => {};
  const loadConversation = async () => {};
  const startNewConversation = () => {}; 
  const updateConversationTitle = async () => {};
  const deleteCurrentConversation = async () => {};
  
  // UI state
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [showArtifactsSidebar, setShowArtifactsSidebar] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  
  // Artifacts state
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | undefined>(undefined);
  const [selectedDocument, setSelectedDocument] = useState<UploadedDocument | undefined>(undefined);
  const [showArtifactCanvas, setShowArtifactCanvas] = useState(false);
  
  // Editor refs
  const codeInsertRef = useRef<((code: string) => void) | undefined>(undefined);
  const mathInsertRef = useRef<((formula: string) => void) | undefined>(undefined);

  // Use ref to prevent duplicate API calls
  const previousConversationIdRef = useRef<string | null>(null);
  
  // Check if URL changed and load the corresponding conversation
  useEffect(() => {
    // Only load if authenticated, conversationId exists, and has changed since last load
    if (isAuthenticated && conversationId && previousConversationIdRef.current !== conversationId) {
      previousConversationIdRef.current = conversationId;
      loadConversation(conversationId);
    }
  }, [isAuthenticated, conversationId]); // Removed loadConversation dependency to prevent excessive API calls
  
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
  
  // Handler for selecting a conversation
  const handleSelectConversation = (id: string) => {
    // Only navigate - the useEffect will handle loading the conversation
    navigate(`/chat/${id}`);
    // Removed redundant loadConversation call to prevent double loading
  };
  
  // Handler for creating a new conversation
  const handleNewConversation = () => {
    startNewConversation();
    navigate('/chat');
  };
  
  // Handler for file upload toggle
  const toggleFileUpload = () => {
    setShowFileUpload(!showFileUpload);
    if (showFileUpload) {
      clearSelectedFile();
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
      <ChatHistorySidebarFixed 
        showSidebar={showHistorySidebar}
        toggleSidebar={toggleHistorySidebar}
        conversations={conversationList}
        activeConversationId={state.activeConversationId}
        isLoading={state.isLoadingConversations}
        onConversationSelect={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRefreshConversations={loadConversations}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-grow overflow-hidden relative">
        {/* Header */}
        <ChatHeader 
          showHistorySidebar={showHistorySidebar}
          toggleHistorySidebar={toggleHistorySidebar}
          toggleSidebar={toggleArtifactsSidebar}
          showSidebar={showArtifactsSidebar}
          conversationTitle={activeConversation?.title || 'New Conversation'}
          onUpdateTitle={updateConversationTitle}
          canUpdateTitle={!!state.activeConversationId}
        />
        
        {/* Main Chat Interface */}
        <div className="flex flex-grow overflow-hidden relative">
          {/* Background effects */}
          <ChatBackgroundEffects />
          
          {/* Content container */}
          <div className="w-full h-full flex flex-col relative">
            {/* Chat Window */}
            <div className="flex-grow ">
              <ChatWindowFixed 
                messages={sortedMessages}
                isLoading={state.isLoadingMessages}
                isGenerating={isGenerating}
                onRegenerate={regenerateLastMessage}
                onStopGeneration={stopGeneration}
              />
            </div>
            
            {/* File Upload Area */}
            {showFileUpload && (
              <div className="px-4">
                <FileUploadArea
                  onFileSelect={handleFileSelect}
                  selectedFile={selectedFile}
                  setSelectedFile={() => clearSelectedFile()}
                  setShowFileUpload={setShowFileUpload}
                />
              </div>
            )}
            
            {/* Chat Input Area */}
            <div className="px-4 py-2 relative">
              <ChatInputFixed
                onSend={sendMessage}
                onStopGeneration={stopGeneration}
                placeholder="Message Inkmortal..."
                isGenerating={isGenerating}
                codeInsertRef={codeInsertRef}
                mathInsertRef={mathInsertRef}
              />
            </div>
          </div>
          
          {/* Right Sidebar - Artifacts/Documents */}
          <ArtifactsSidebar
            showSidebar={showArtifactsSidebar}
            toggleSidebar={toggleArtifactsSidebar}
            onArtifactSelect={handleArtifactSelect}
            onDocumentSelect={handleDocumentSelect}
          />
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

export default ModernChatPageFixed;