import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../../services/chat/ChatStore';
import ChatHeader from './layout/ChatHeader';
import ChatWindow from '../../../components/chat/ChatWindow';
import ChatInputAdapterWithStop from '../../../components/chat/ChatInputAdapterWithStop';
import ChatHistorySidebar from '../../../components/chat/ChatHistorySidebar';
import ChatBackgroundEffects from './layout/ChatBackgroundEffects';
import { useTheme } from '../../../context/ThemeContext';
import { MessageStatus } from '../types/message';

interface ChatPageProps {
  conversationId: string;
}

/**
 * The main chat page component for an active conversation
 */
const ChatPage: React.FC<ChatPageProps> = ({ conversationId }) => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const { 
    messages,
    conversations,
    activeConversationId,
    sendMessage,
    loadConversations,
    isLoading,
    isLoadingConversations
  } = useChatStore();
  
  // Local UI state
  const [showHistorySidebar, setShowHistorySidebar] = useState(true);

  // Get sorted messages for the current conversation
  const sortedMessages = Object.values(messages)
    .filter(message => message.conversationId === activeConversationId)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Get the active conversation
  const activeConversation = conversations[conversationId];
  
  // Check if any message is being generated
  const isGenerating = sortedMessages.some(
    msg => msg.status === MessageStatus.STREAMING || 
           msg.status === MessageStatus.PROCESSING ||
           msg.status === MessageStatus.QUEUED
  );

  // Handler for sidebar toggle
  const toggleHistorySidebar = () => {
    setShowHistorySidebar(!showHistorySidebar);
  };

  // Handler for sending messages
  const handleSendMessage = async (content: string, file: File | null = null) => {
    await sendMessage(content, file);
  };

  // Handler for selecting a conversation
  const handleSelectConversation = (id: string) => {
    if (id === conversationId) return;
    navigate(`/chat/${id}`);
  };

  // Handler for creating a new conversation
  const handleNewConversation = () => {
    navigate('/chat');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: currentTheme.colors.bgPrimary }}>
      {/* Left Sidebar - Conversation History */}
      <ChatHistorySidebar 
        showSidebar={showHistorySidebar}
        toggleSidebar={toggleHistorySidebar}
        conversations={Object.values(conversations)}
        activeConversationId={activeConversationId}
        isLoading={isLoadingConversations}
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
          toggleSidebar={() => {}}
          showSidebar={false}
          conversationTitle={activeConversation?.title || 'Chat'}
          onUpdateTitle={() => {}}
          canUpdateTitle={!!activeConversationId}
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
                isLoading={isLoading}
                isGenerating={isGenerating}
                onRegenerate={() => {}}
                onStopGeneration={() => {}}
              />
            </div>
            
            {/* Chat Input Area */}
            <div className="px-4 py-2 relative">
              <ChatInputAdapterWithStop
                onSendMessage={handleSendMessage}
                onStopGeneration={() => {}}
                placeholder="Message Inkmortal..."
                isGenerating={isGenerating}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;