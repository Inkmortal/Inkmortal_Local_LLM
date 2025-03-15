import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../../services/chat/ChatStore';
import { useTheme } from '../../context/ThemeContext';
import ChatHistorySidebar from '../../components/chat/ChatHistorySidebar';
import ChatHeader from './components/layout/ChatHeader';
import ChatBackgroundEffects from './components/layout/ChatBackgroundEffects';
import ChatWindow from '../../components/chat/ChatWindow';
import ChatInputAdapterWithStop from '../../components/chat/ChatInputAdapterWithStop';
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

  // On mount, load the conversation list once
  useEffect(() => {
    console.log('[ChatRouter] Loading conversation list');
    loadConversations();
  }, [loadConversations]);

  // Handle conversationId parameter changes
  useEffect(() => {
    // If we have a conversation ID in the URL, load that conversation
    if (conversationId) {
      console.log(`[ChatRouter] Loading conversation from URL: ${conversationId}`);
      loadConversation(conversationId);
    } else {
      // No conversation ID, clear active conversation
      console.log('[ChatRouter] No conversation ID in URL, showing empty state');
      clearActiveConversation();
    }
  }, [conversationId, loadConversation, clearActiveConversation]);

  // Handle new conversation creation (after first message is sent)
  const handleNewConversation = async (content: string, file: File | null = null) => {
    if (!content.trim() && !file) return;
    
    console.log('[ChatRouter] Creating new conversation with message:', content);
    try {
      // Send the message and get the response with potential new conversation ID
      const response = await sendMessage(content, file);
      
      // Check if we got a conversation ID from the response
      if (response && response.conversation_id) {
        const newConversationId = response.conversation_id;
        console.log(`[ChatRouter] New conversation created: ${newConversationId}, updating URL`);
        navigate(`/chat/${newConversationId}`, { replace: true });
      } else {
        console.error('[ChatRouter] No conversation ID received from backend');
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
          {conversationId ? (
            // Content container for active conversation
            <div className="w-full h-full flex flex-col relative">
              {/* Chat Window */}
              <div className="flex-grow overflow-hidden">
                <ChatWindow 
                  messages={conversationMessages}
                  isLoading={isLoading}
                  isGenerating={isGenerating}
                  onRegenerate={() => {
                    // Implement regenerate functionality if needed
                    console.log('[ChatRouter] Regenerate requested');
                  }}
                  onStopGeneration={() => {
                    // Implement stop generation if needed
                    console.log('[ChatRouter] Stop generation requested');
                  }}
                />
              </div>
              
              {/* Chat Input Area */}
              <div className="px-4 py-2 relative">
                <ChatInputAdapterWithStop
                  onSendMessage={sendMessage}
                  onStopGeneration={() => {
                    // Implement stop generation if needed
                    console.log('[ChatRouter] Stop generation requested');
                  }}
                  placeholder="Message Inkmortal..."
                  isGenerating={isGenerating}
                />
              </div>
            </div>
          ) : (
            // Empty conversation view (welcome screen)
            <EmptyConversationView onSendMessage={handleNewConversation} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRouter;