import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../../services/chat/ChatStore';
import { useTheme } from '../../context/ThemeContext';
import { ensureWebSocketConnection } from '../../services/chat/websocketService';
import ChatHistorySidebar from '../../components/chat/ChatHistorySidebar';
import ChatHeader from './components/layout/ChatHeader';
import ChatBackgroundEffects from './components/layout/ChatBackgroundEffects';
import ChatWindow from '../../components/chat/ChatWindow';
import TipTapAdapterWithStop from '../../components/chat/TipTapAdapterWithStop';
import EmptyConversationView from './components/EmptyConversationView';

/**
 * Router component for the chat feature
 * Provides consistent layout and handles URL-based routing
 */
const ChatRouter: React.FC = () => {
  const { currentTheme } = useTheme();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { 
    loadConversation, 
    clearActiveConversation, 
    loadConversations,
    sendMessage, 
    activeConversationId,
    messages,
    conversations,
    isLoading,
    isLoadingConversations
  } = useChatStore();

  // UI state
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const tokenRef = useRef<string | null>(null);

  // On mount, establish WebSocket connection and load conversation list
  useEffect(() => {
    console.log('[ChatRouter] Initializing chat environment');
    
    // Get token from localStorage
    tokenRef.current = localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    // Establish persistent WebSocket connection at chat UI load time
    if (tokenRef.current) {
      // Use setTimeout to ensure component mount is complete before attempting connection
      setTimeout(() => {
        console.log('[ChatRouter] Establishing persistent WebSocket connection');
        ensureWebSocketConnection(tokenRef.current)
          .then(connected => {
            console.log(`[ChatRouter] WebSocket connection established: ${connected}`);
            setIsConnected(connected);
          })
          .catch(error => {
            console.error('[ChatRouter] WebSocket connection error:', error);
            setIsConnected(false);
          });
      }, 500);
    }
    
    // Load conversation list
    console.log('[ChatRouter] Loading conversation list');
    loadConversations();
  }, [loadConversations]);
  
  // No longer using custom events for navigation
  // All navigation now happens directly via ChatStore with window.location
  // This ensures a single source of truth for the active conversation ID

  // Handle conversationId parameter changes
  useEffect(() => {
    console.log(`[ChatRouter] URL parameter changed, conversationId: ${conversationId || 'null'}`);
    console.log(`[ChatRouter] Current activeConversationId: ${activeConversationId || 'null'}`);
    
    // If we have a conversation ID in the URL, load that conversation
    if (conversationId) {
      // Check if we already have this conversation loaded to avoid unnecessary reloads
      if (conversationId === activeConversationId) {
        console.log(`[ChatRouter] Conversation ${conversationId} is already active, skipping reload`);
        return;
      }
      
      console.log(`[ChatRouter] Loading conversation from URL: ${conversationId}`);
      loadConversation(conversationId);
    } else {
      // No conversation ID, clear active conversation
      console.log('[ChatRouter] No conversation ID in URL, showing empty state');
      clearActiveConversation();
    }
  }, [conversationId, loadConversation, clearActiveConversation, activeConversationId]);

  // Handle new conversation creation (after first message is sent)
  const handleNewConversation = async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) return;
    
    console.log('[ChatRouter] Creating new conversation with message:', content);
    try {
      // Set UI state first to provide immediate feedback
      setShowHistorySidebar(true); // Always show sidebar when starting a conversation
      
      // Log the current state to help with debugging
      console.log(`[ChatRouter] Current active conversation before sending: ${activeConversationId || 'null'}`);
      console.log('[ChatRouter] Sending message to create new conversation...');
      
      // This uses the two-phase message sending process:
      // 1. First phase: Send message, let backend create conversation if needed
      // 2. Second phase: WebSocket receives updates, UI updates with streaming content
      const response = await sendMessage(content, file);
      
      // The URL change will now be handled by our event listener
      // This avoids direct manipulation of window.history and uses React Router properly
      
      // Check if we got a valid response with conversation ID (for logging/debugging)
      if (response && response.conversation_id) {
        const newConversationId = response.conversation_id;
        console.log(`[ChatRouter] Backend confirmed new conversation: ${newConversationId}`);
        
        // The URL will be updated via the custom event handler we added
        // No need to call navigate() here - this prevents duplicate navigation
      } else {
        console.error('[ChatRouter] No valid conversation ID received from backend');
        // Show user-friendly error - message state already updated by ChatStore
      }
    } catch (error) {
      console.error('[ChatRouter] Error creating new conversation:', error);
    }
  };

  // Handler for selecting a conversation
  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return;
    console.log(`[ChatRouter] Selecting conversation: ${id}`);
    navigate(`/chat/${id}`);
  };

  // Handler for creating a brand new empty conversation
  const handleStartNewConversation = () => {
    console.log('[ChatRouter] Starting new conversation');
    navigate('/chat');
  };

  // Toggle sidebar visibility
  const toggleHistorySidebar = () => {
    setShowHistorySidebar(!showHistorySidebar);
  };

  // Get sorted messages for current conversation
  const conversationMessages = Object.values(messages)
    .filter(msg => msg.conversationId === activeConversationId)
    .sort((a, b) => a.timestamp - b.timestamp);
    
  // Check if any message is currently being generated
  const isGenerating = conversationMessages.some(msg => 
    msg.status === 'streaming' || 
    msg.status === 'processing' || 
    msg.status === 'queued'
  );
    
  // Get current conversation details  
  const activeConversation = conversationId ? conversations[conversationId] : null;
  
  // Create consistent layout with conditional content
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
      {/* Left Sidebar - Conversation History (always present) */}
      <ChatHistorySidebar 
        showSidebar={showHistorySidebar}
        toggleSidebar={toggleHistorySidebar}
        conversations={Object.values(conversations)}
        activeConversationId={activeConversationId}
        isLoading={isLoadingConversations}
        onConversationSelect={handleSelectConversation}
        onNewConversation={handleStartNewConversation}
        onRefreshConversations={loadConversations}
      />

      {/* Main Content Area (always present) */}
      <div className="flex flex-col flex-grow overflow-hidden relative">
        {/* Header (always present) */}
        <ChatHeader 
          showHistorySidebar={showHistorySidebar}
          toggleHistorySidebar={toggleHistorySidebar}
          toggleSidebar={() => {}}
          showSidebar={false}
          conversationTitle={activeConversation?.title || 'New Conversation'}
          onUpdateTitle={() => {}}
          canUpdateTitle={!!activeConversationId && activeConversationId !== 'new'}
        />
        
        {/* Main Content */}
        <div className="flex flex-grow overflow-hidden relative">
          {/* Background effects */}
          <ChatBackgroundEffects />
          
          {/* Conditional content based on conversation state */}
          {activeConversationId ? (
            // Content container for active conversation (with messages or empty state)
            <div className="w-full h-full flex flex-col relative">
              {/* Chat Window - Always show when we have an active conversation */}
              <div className="flex-grow overflow-hidden">
                {/* Always show ChatWindow when we have an active conversation */}
                <ChatWindow 
                  messages={conversationMessages}
                  isLoading={isLoading}
                  isGenerating={isGenerating}
                  onRegenerate={() => {
                    console.log('[ChatRouter] Regenerate requested');
                  }}
                  onStopGeneration={() => {
                    console.log('[ChatRouter] Stop generation requested');
                  }}
                />
              </div>
              
              {/* Chat Input Area - Always present with active conversation */}
              <div className="px-4 py-2 relative">
                <TipTapAdapterWithStop
                  onSendMessage={sendMessage}
                  onStopGeneration={() => {
                    console.log('[ChatRouter] Stop generation requested');
                  }}
                  placeholder="Message Inkmortal..."
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          ) : (
            // Welcome screen - Only show when there's no active conversation
            <EmptyConversationView onSendMessage={handleNewConversation} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRouter;