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
import ChatContainer from './components/chat/ChatContainer';
import ChatWindow from '../../components/chat/ChatWindow';
import ChatInputAdapterWithStop from '../../components/chat/ChatInputAdapterWithStop';
import ChatHistorySidebar from '../../components/chat/ChatHistorySidebar';
import ArtifactsSidebar, { Artifact, UploadedDocument } from '../../components/artifacts/ArtifactsSidebar';
import ArtifactCanvas from '../../components/artifacts/ArtifactCanvas';
import FileUploadArea from './components/chat/FileUploadArea';

// Import hooks
import { useChat } from './hooks/useChat';
import { MessageStatus } from './types/message';

const ModernChatPage: React.FC = () => {
  const { currentTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  
  // Initialize chat state with the conversation ID from URL
  const {
    state,
    loadConversation,
    loadConversations,
    startNewConversation,
    deleteCurrentConversation,
    updateConversationTitle,
    sendMessage,
    regenerateLastMessage,
    stopGeneration,
    isGenerating,
    conversationList,
    sortedMessages,
    activeConversation,
    handleFileSelect,
    clearSelectedFile,
    selectedFile
  } = useChat({
    initialConversationId: conversationId || null,
    autoConnect: true
  });
  
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
  
  // Track whether conversations have been loaded
  const hasLoadedConversationsRef = useRef(false);
  
  // Single unified effect to handle both conversation list and active conversation
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Keep track of the current action being performed
    let isCancelled = false;
    
    const initializeChat = async () => {
      try {
        // First load the conversation list if needed
        if (!hasLoadedConversationsRef.current) {
          console.log('[ModernChatPage] Loading conversations list');
          await loadConversations();
          hasLoadedConversationsRef.current = true;
          
          if (isCancelled) return;
        }
        
        // Then handle specific conversation or empty state
        if (conversationId) {
          console.log(`[ModernChatPage] Loading conversation from URL: ${conversationId}`);
          await loadConversation(conversationId);
        } else {
          // On /chat route with no ID, just show empty state
          console.log('[ModernChatPage] Initializing empty chat state');
          startNewConversation();
        }
      } catch (error) {
        console.error('[ModernChatPage] Error initializing chat:', error);
      }
    };
    
    initializeChat();
    
    // Cleanup function to prevent state updates after unmount or re-render
    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, conversationId, loadConversations, loadConversation, startNewConversation]);
  
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
  
  // Handler for selecting a conversation - only navigation, no state updates
  const handleSelectConversation = (id: string) => {
    console.log(`[ModernChatPage] Selecting conversation: ${id}`);
    // Only navigate - the effect will handle loading the conversation based on URL
    navigate(`/chat/${id}`);
  };
  
  // Handler for creating a new conversation - only navigation, no state updates
  const handleNewConversation = () => {
    console.log('[ModernChatPage] Creating new conversation');
    // Only navigate - the effect will handle creating a new conversation based on URL
    navigate('/chat');
  };
  
  // Handler for file upload toggle
  const toggleFileUpload = () => {
    setShowFileUpload(!showFileUpload);
    if (showFileUpload) {
      clearSelectedFile();
    }
  };
  
  // Editor handlers
  const handleInsertCode = (language?: string, template?: string) => {
    // This will be implemented by the editor component itself
    console.log('Inserting code:', language, template);
  };
  
  const handleInsertMath = (formula?: string) => {
    // This will be implemented by the editor component itself
    console.log('Inserting math:', formula);
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
      <ChatHistorySidebar 
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
            <div className="flex-grow overflow-hidden">
              <ChatWindow 
                messages={sortedMessages}
                isLoading={state.isLoadingMessages}
                isGenerating={isGenerating}
                onRegenerate={() => regenerateLastMessage()}
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
              <ChatInputAdapterWithStop
                onSendMessage={sendMessage}
                onStopGeneration={stopGeneration}
                onFileSelect={handleFileSelect}
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

export default ModernChatPage;