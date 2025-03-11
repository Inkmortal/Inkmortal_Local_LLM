import React, { useState } from 'react';
import { Conversation } from '../../pages/chat/types/message';

interface ChatHistorySidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: (title: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRefresh: () => void;
}

export const ChatHistorySidebarV2: React.FC<ChatHistorySidebarProps> = ({
  conversations,
  activeConversationId,
  isLoading,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onRefresh
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Handle new conversation
  const handleCreateStart = () => {
    setIsCreating(true);
    setNewTitle('');
  };
  
  const handleCreateCancel = () => {
    setIsCreating(false);
  };
  
  const handleCreateSubmit = () => {
    if (newTitle.trim()) {
      onCreateConversation(newTitle.trim());
      setIsCreating(false);
      setNewTitle('');
    }
  };
  
  // Handle delete confirmation
  const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(conversationId);
  };
  
  const handleDeleteConfirm = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(conversationId);
    setDeleteConfirmId(null);
  };
  
  const handleDeleteCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };
  
  // Sort conversations by most recent
  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
  
  return (
    <div className="chat-history-sidebar">
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <div className="header-actions">
          <button
            className="new-conversation-button"
            onClick={handleCreateStart}
            disabled={isLoading || isCreating}
          >
            New
          </button>
          <button
            className="refresh-button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? '...' : '↻'}
          </button>
        </div>
      </div>
      
      {/* New conversation form */}
      {isCreating && (
        <div className="new-conversation-form">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Conversation title"
            autoFocus
          />
          <div className="form-actions">
            <button
              className="create-button"
              onClick={handleCreateSubmit}
              disabled={!newTitle.trim()}
            >
              Create
            </button>
            <button
              className="cancel-button"
              onClick={handleCreateCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Conversation list */}
      <div className="conversations-list">
        {isLoading && conversations.length === 0 ? (
          <div className="loading-state">
            <span>Loading conversations...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet</p>
            <button onClick={handleCreateStart}>Start a new conversation</button>
          </div>
        ) : (
          <ul>
            {sortedConversations.map(conversation => (
              <li
                key={conversation.id}
                className={`conversation-item ${activeConversationId === conversation.id ? 'active' : ''}`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="conversation-title">
                  {conversation.title}
                </div>
                <div className="conversation-date">
                  {new Date(conversation.updatedAt).toLocaleDateString()}
                </div>
                
                {/* Delete button/confirmation */}
                {deleteConfirmId === conversation.id ? (
                  <div className="delete-confirmation" onClick={e => e.stopPropagation()}>
                    <span>Delete?</span>
                    <button
                      className="confirm-button"
                      onClick={e => handleDeleteConfirm(conversation.id, e)}
                    >
                      Yes
                    </button>
                    <button
                      className="cancel-button"
                      onClick={handleDeleteCancel}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="delete-button"
                    onClick={e => handleDeleteClick(conversation.id, e)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};