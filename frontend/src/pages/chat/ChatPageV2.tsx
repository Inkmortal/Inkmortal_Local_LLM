import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Assuming this exists
import { useChat } from './hooks/useChat';
import { ChatWindowV2 } from '../../components/chat/ChatWindowV2';
import { ChatInputV2 } from '../../components/chat/ChatInputV2';
import { ChatHistorySidebarV2 } from '../../components/chat/ChatHistorySidebarV2';

export const ChatPageV2: React.FC = () => {
  // Get authentication token from auth context
  const { token } = useAuth();
  
  // Get conversation ID from URL params
  const { conversationId } = useParams<{ conversationId?: string }>();
  
  // Navigation
  const navigate = useNavigate();
  
  // Initialize chat state
  const {
    conversations,
    messages,
    activeConversationId,
    isLoadingConversations,
    isLoadingMessages,
    error,
    isConnected,
    
    loadConversations,
    loadConversation,
    sendMessage,
    deleteConversation,
    createConversation,
    clearError
  } = useChat({
    authToken: token || '',
    debug: true
  });
  
  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);
  
  // Handle conversation selection
  const handleSelectConversation = useCallback((id: string) => {
    navigate(`/chat/${id}`);
  }, [navigate]);
  
  // Load conversation when ID changes
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else if (conversations.length > 0 && !activeConversationId) {
      // If no conversation is selected but we have conversations, select the most recent one
      handleSelectConversation(conversations[0].id);
    }
  }, [conversationId, conversations, activeConversationId, loadConversation, handleSelectConversation]);
  
  // Handle sending message
  const handleSendMessage = useCallback((message: string) => {
    sendMessage(message, activeConversationId || undefined);
  }, [sendMessage, activeConversationId]);
  
  // Handle conversation creation
  const handleCreateConversation = useCallback(async (title: string) => {
    const conversation = await createConversation(title);
    if (conversation) {
      handleSelectConversation(conversation.id);
    }
  }, [createConversation, handleSelectConversation]);
  
  // Handle conversation deletion
  const handleDeleteConversation = useCallback((id: string) => {
    deleteConversation(id);
    
    // If the active conversation was deleted, select another one or create a new one
    if (id === activeConversationId) {
      if (conversations.length > 1) {
        // Find the next conversation to select
        const nextConversation = conversations.find(c => c.id !== id);
        if (nextConversation) {
          handleSelectConversation(nextConversation.id);
        }
      } else {
        // No more conversations, navigate to base chat route
        navigate('/chat');
      }
    }
  }, [deleteConversation, activeConversationId, conversations, handleSelectConversation, navigate]);
  
  // Handle error display
  useEffect(() => {
    if (error) {
      console.error('Chat error:', error);
      
      // Clear error after 5 seconds
      const timeoutId = setTimeout(() => {
        clearError();
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [error, clearError]);
  
  return (
    <div className="chat-page">
      {/* Sidebar */}
      <ChatHistorySidebarV2
        conversations={conversations}
        activeConversationId={activeConversationId}
        isLoading={isLoadingConversations}
        onSelectConversation={handleSelectConversation}
        onCreateConversation={handleCreateConversation}
        onDeleteConversation={handleDeleteConversation}
        onRefresh={loadConversations}
      />
      
      {/* Main chat area */}
      <div className="chat-area">
        {/* Connection status */}
        {!isConnected && (
          <div className="connection-status disconnected">
            Disconnected from server. Reconnecting...
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="error-notification">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error.message}</span>
            <button onClick={clearError}>×</button>
          </div>
        )}
        
        {/* Chat window */}
        <ChatWindowV2
          messages={messages}
          isLoading={isLoadingMessages}
          onRetry={(messageId) => {
            const userMessage = messages
              .filter(m => m.id === messageId)
              .map(m => m.content)
              .pop();
              
            if (userMessage) {
              sendMessage(userMessage, activeConversationId || undefined);
            }
          }}
        />
        
        {/* Chat input */}
        <ChatInputV2
          onSendMessage={handleSendMessage}
          disabled={!isConnected || isLoadingMessages}
          placeholder={!isConnected ? "Reconnecting..." : "Type your message here..."}
        />
      </div>
    </div>
  );
};