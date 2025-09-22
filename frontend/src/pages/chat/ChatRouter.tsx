import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../../services/chat/ChatStore';
import { useTheme } from '../../context/ThemeContext';
import ChatHistorySidebar from '../../components/chat/ChatHistorySidebar';
import ChatHeader from './components/layout/ChatHeader';
import ChatBackgroundEffects from './components/layout/ChatBackgroundEffects';
import ChatWindow from '../../components/chat/ChatWindow';
import TipTapAdapterWithStop from '../../components/chat/TipTapAdapterWithStop';
import EmptyConversationView from './components/EmptyConversationView';
import { useChatConnection } from '../../services/chat/ChatConnectionContext';

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
  // Start with sidebar closed on mobile, open on desktop
  const [showHistorySidebar, setShowHistorySidebar] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isConnected, setIsConnected] = useState(false);
  const tokenRef = useRef<string | null>(null);

  // Access the centralized connection context
  const chatConnection = useChatConnection();
  
  // On mount, establish WebSocket connection and load conversation list
  useEffect(() => {
    console.log('[ChatRouter] Initializing chat environment');
    
    // Get token from localStorage - CRITICAL FIX: Use consistent token retrieval
    tokenRef.current = localStorage.getItem('authToken') || localStorage.getItem('auth_token') || localStorage.getItem('token');
    
    // Establish persistent WebSocket connection at chat UI load time
    if (tokenRef.current) {
      // Use setTimeout to ensure component mount is complete before attempting connection
      setTimeout(() => {
        console.log('[ChatRouter] Ensuring persistent WebSocket connection via ChatConnectionContext');
        
        // CRITICAL FIX: Make connection manager available globally for non-React contexts
        if (window && !window.__chatConnection) {
          window.__chatConnection = chatConnection;
          console.log('[ChatRouter] Exposed chatConnection to window.__chatConnection for non-React contexts');
        }
        
        // Check if already connected first
        if (chatConnection.isConnected) {
          console.log('[ChatRouter] WebSocket already connected via ChatConnectionContext');
          setIsConnected(true);
        } else {
          console.log('[ChatRouter] Establishing new connection via ChatConnectionContext');
          chatConnection.connect(tokenRef.current)
            .then(connected => {
              console.log(`[ChatRouter] WebSocket connection established: ${connected}`);
              setIsConnected(connected);
              
              // Store token for reconnection attempts
              if (connected && window) {
                window._currentWebSocketToken = tokenRef.current;
              }
            })
            .catch(error => {
              console.error('[ChatRouter] WebSocket connection error:', error);
              setIsConnected(false);
            });
        }
      }, 1000); // Increased timeout to ensure provider is fully mounted
    }
    
    // Set up a connection status listener
    const unsubscribe = chatConnection.addConnectionListener((connected) => {
      console.log(`[ChatRouter] WebSocket connection status changed: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
      setIsConnected(connected);
    });
    
    // Load conversation list
    console.log('[ChatRouter] Loading conversation list');
    loadConversations();
    
    // Clean up on unmount
    return () => {
      unsubscribe();
      // Don't close the connection on component unmount - it should persist for the entire application lifecycle
    };
  }, [loadConversations, chatConnection]);
  
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

      console.log('[ChatRouter] sendMessage response:', response);
      console.log('[ChatRouter] response type:', typeof response);
      console.log('[ChatRouter] response keys:', response ? Object.keys(response) : 'null');
      console.log('[ChatRouter] response JSON:', JSON.stringify(response, null, 2));

      // The URL change will now be handled by our event listener
      // This avoids direct manipulation of window.history and uses React Router properly

      // Check if we got a valid response with conversation ID
      if (response && response.conversation_id) {
        const newConversationId = response.conversation_id;
        console.log(`[ChatRouter] Backend confirmed new conversation: ${newConversationId}`);
        console.log(`[ChatRouter] Current URL conversationId: ${conversationId}`);
        console.log(`[ChatRouter] Current activeConversationId: ${activeConversationId}`);

        // FIXED: Check URL param instead of activeConversationId which may already be updated
        if (!conversationId || conversationId !== newConversationId) {
          console.log(`[ChatRouter] URL needs update, navigating to /chat/${newConversationId}`);

          // Use React Router for smooth client-side navigation
          navigate(`/chat/${newConversationId}`, { replace: false });

          console.log(`[ChatRouter] Navigation called`);
        } else {
          console.log(`[ChatRouter] URL already correct, no navigation needed`);
        }
      } else {
        console.error('[ChatRouter] No valid conversation ID received from backend');
        console.error('[ChatRouter] Response was:', JSON.stringify(response, null, 2));
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

  // Get sorted messages for current conversation with deterministic ordering
  const conversationMessages = Object.values(messages)
    .filter(msg => msg.conversationId === activeConversationId)
    .sort((a, b) => {
      // Primary sort by timestamp
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      // Secondary sort for identical timestamps: user messages always come before assistant
      if (a.role === 'user' && b.role === 'assistant') {
        return -1;
      }
      if (a.role === 'assistant' && b.role === 'user') {
        return 1;
      }
      // Tertiary sort by message ID for completely identical cases
      return a.id.localeCompare(b.id);
    });
    
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
    <div className="flex h-screen overflow-hidden relative" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
      {/* Mobile backdrop overlay */}
      {showHistorySidebar && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-40 transition-opacity md:hidden"
          onClick={toggleHistorySidebar}
          aria-hidden="true"
        />
      )}

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
      <div className={`
        flex flex-col flex-grow overflow-hidden relative transition-all duration-300
        ${showHistorySidebar ? 'md:ml-0' : 'md:-ml-72'}
      `}>
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
        <div className="flex-grow flex flex-col overflow-hidden relative">
          {/* Background effects */}
          <ChatBackgroundEffects />

          {/* Conditional content based on conversation state */}
          {activeConversationId ? (
            // Content container for active conversation
            <div className="w-full h-full flex flex-col relative z-10">
              {/* Chat Window - handles its own scrolling */}
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
              
              {/* Chat Input Area - Always present with active conversation */}
              <div className="flex-shrink-0 px-4 py-2 relative">
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
            // Welcome screen with its own scrolling
            <div className="w-full h-full overflow-y-auto modern-scrollbar relative z-10">
              <EmptyConversationView onSendMessage={handleNewConversation} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRouter;