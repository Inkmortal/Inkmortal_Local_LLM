import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../../services/chat/ChatStore';
import ChatPage from './components/ChatPage';
import EmptyConversationView from './components/EmptyConversationView';

/**
 * Router component for the chat feature
 * Handles URL state management and routing based on conversationId
 */
const ChatRouter: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { 
    loadConversation, 
    clearActiveConversation, 
    loadConversations,
    sendMessage, 
    activeConversationId
  } = useChatStore();

  // On mount, load the conversation list once
  useEffect(() => {
    // Load conversations list
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
    // Send the message and get the response
    const response = await sendMessage(content, file);
    
    // Check if we got a conversation ID from the response
    if (response && response.conversation_id) {
      const newConversationId = response.conversation_id;
      console.log(`[ChatRouter] New conversation created: ${newConversationId}, updating URL`);
      navigate(`/chat/${newConversationId}`, { replace: true });
    }
  };

  // Render the appropriate component based on whether we have an active conversation
  return conversationId ? (
    <ChatPage conversationId={conversationId} />
  ) : (
    <EmptyConversationView onSendMessage={handleNewConversation} />
  );
};

export default ChatRouter;