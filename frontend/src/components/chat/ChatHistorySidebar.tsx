import React, { useState, useCallback, useEffect, memo, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';
import { 
  deleteConversation, 
  updateConversationTitle,
  listConversations 
} from '../../services/chat/conversationService';
import { Conversation } from '../../pages/chat/types/message';
import { showError, showSuccess } from '../../utils/notifications';

interface ChatHistorySidebarProps {
  // Visibility control
  showSidebar: boolean;
  toggleSidebar: () => void;
  
  // Data props
  conversations: Conversation[] | null;
  activeConversationId: string | null;
  isLoading: boolean;
  
  // Action handlers
  onConversationSelect: (id: string) => void;
  onNewConversation: () => void;
  onRefreshConversations: () => Promise<void>;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  showSidebar,
  toggleSidebar,
  conversations,
  activeConversationId,
  isLoading,
  onConversationSelect,
  onNewConversation,
  onRefreshConversations
}) => {
  const { currentTheme } = useTheme();
  
  // Internal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editTitleId, setEditTitleId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created'>('updated');
  
  // Refs for tracking timeouts
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  // Filter and sort conversations
  const filteredConversations = useCallback(() => {
    if (!conversations) return [];
    
    return conversations
      .filter(conv => {
        if (!searchQuery.trim()) return true;
        return conv.title.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        const dateA = sortBy === 'updated' ? new Date(a.updatedAt) : new Date(a.createdAt);
        const dateB = sortBy === 'updated' ? new Date(b.updatedAt) : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Newest first
      });
  }, [conversations, searchQuery, sortBy]);
  
  // Format date for display
  const formatDate = (timestamp: number | string | Date): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // If today, show time
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If yesterday, show "Yesterday"
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // If within a week, show day name
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    if (date > oneWeekAgo) {
      return date.toLocaleDateString(undefined, { weekday: 'long' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  
  // Handle deletion confirmation and process
  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>, convId: string) => {
    e.stopPropagation(); // Prevent conversation selection
    
    if (confirmDeleteId === convId) {
      // User confirmed deletion, proceed with delete
      setDeletingId(convId);
      try {
        const result = await deleteConversation(convId);
        if (result.success) {
          showSuccess('Conversation deleted successfully');
          
          // If we deleted the current conversation, create a new one
          if (convId === activeConversationId) {
            onNewConversation();
          }
          
          // Refresh the conversation list
          onRefreshConversations();
        } else {
          showError(`Failed to delete conversation: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting conversation:', error);
        showError('Error deleting conversation. Please try again.');
      } finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
        
        // Clear any timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    } else {
      // First click - ask for confirmation
      setConfirmDeleteId(convId);
      
      // Clear existing timeout if any
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Auto-reset confirmation after 3 seconds
      timeoutRef.current = setTimeout(() => {
        setConfirmDeleteId((current) => current === convId ? null : current);
        timeoutRef.current = null;
      }, 3000);
    }
  };
  
  // Handle edit title mode
  const handleEditTitleClick = (e: React.MouseEvent<HTMLButtonElement>, convId: string, currentTitle: string) => {
    e.stopPropagation(); // Prevent conversation selection
    setEditTitleId(convId);
    setNewTitle(currentTitle);
  };
  
  // Save updated title
  const handleSaveTitle = async (convId: string) => {
    if (!newTitle.trim()) {
      setEditTitleId(null);
      return;
    }
    
    try {
      const result = await updateConversationTitle(convId, newTitle.trim());
      if (result.success) {
        // Refresh the conversation list
        onRefreshConversations();
      } else {
        showError(`Failed to update title: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
      showError('Error updating title. Please try again.');
    } finally {
      setEditTitleId(null);
    }
  };
  
  // Cancel title editing
  const handleCancelTitleEdit = () => {
    setEditTitleId(null);
    setNewTitle('');
  };
  
  // Handle title input key press
  const handleTitleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, convId: string) => {
    if (e.key === 'Enter') {
      handleSaveTitle(convId);
    } else if (e.key === 'Escape') {
      handleCancelTitleEdit();
    }
  };
  
  // Reset UI state when sidebar visibility changes and clean up on unmount
  useEffect(() => {
    if (!showSidebar) {
      setConfirmDeleteId(null);
      setDeletingId(null);
      setEditTitleId(null);
      setNewTitle('');
    }
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [showSidebar]);
  
  // Don't render if sidebar is hidden
  if (!showSidebar) return null;
  
  // Define features for the features list
  const features = [
    { id: 'math', label: 'Math expressions', color: currentTheme.colors.accentPrimary },
    { id: 'code', label: 'Code syntax highlighting', color: currentTheme.colors.accentSecondary },
    { id: 'docs', label: 'Document uploading', color: currentTheme.colors.accentTertiary }
  ];
  
  return (
    <aside 
      className="flex-shrink-0 h-full transition-all w-72 relative flex flex-col"
      style={{ 
        background: `linear-gradient(165deg, ${currentTheme.colors.bgSecondary}95, ${currentTheme.colors.bgTertiary}95)`,
        backdropFilter: 'blur(10px)',
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.07), 0 0 0 1px ${currentTheme.colors.borderColor}30`,
        borderRight: `1px solid ${currentTheme.colors.borderColor}30`,
        zIndex: 20,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Header with title and close button */}
      <div 
        className="px-4 py-3 border-b flex justify-between items-center"
        style={{ 
          borderColor: `${currentTheme.colors.borderColor}40`,
          background: `linear-gradient(90deg, ${currentTheme.colors.accentPrimary}10, transparent)`,
        }}
      >
        <h3 
          className="text-base font-medium flex items-center"
          style={{ color: currentTheme.colors.textPrimary }}
        >
          <svg aria-hidden="true" className="w-4 h-4 mr-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Conversations
        </h3>
        <Button
          size="xs"
          variant="ghost"
          className="rounded-full p-1.5"
          style={{
            color: currentTheme.colors.textSecondary
          }}
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </Button>
      </div>
      
      {/* Action bar with new chat button and search */}
      <div className="p-3 space-y-3 border-b" style={{ borderColor: `${currentTheme.colors.borderColor}20` }}>
        {/* New chat button */}
        <button 
          className="w-full p-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center"
          style={{ 
            background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}20, ${currentTheme.colors.accentSecondary}20)`,
            color: currentTheme.colors.textSecondary,
            border: `1px solid ${currentTheme.colors.borderColor}40`,
          }}
          onClick={onNewConversation}
          aria-label="Start new conversation"
        >
          <svg aria-hidden="true" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Conversation
        </button>
        
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full p-2 pl-8 rounded-md text-sm"
            style={{
              backgroundColor: `${currentTheme.colors.bgPrimary}80`,
              color: currentTheme.colors.textPrimary,
              border: `1px solid ${currentTheme.colors.borderColor}40`,
            }}
            value={searchQuery}
            onChange={handleSearchChange}
            aria-label="Search conversations"
          />
          <svg 
            aria-hidden="true"
            className="w-4 h-4 absolute left-2 top-2.5 opacity-60" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Sort controls */}
        <div className="flex justify-between text-xs">
          <span style={{ color: currentTheme.colors.textMuted }}>Sort by:</span>
          <div className="flex space-x-3">
            <button 
              className={`transition-colors ${sortBy === 'updated' ? 'font-medium' : ''}`}
              style={{ 
                color: sortBy === 'updated' 
                  ? currentTheme.colors.accentPrimary 
                  : currentTheme.colors.textMuted 
              }}
              onClick={() => setSortBy('updated')}
              aria-pressed={sortBy === 'updated'}
              aria-label="Sort by recent updates"
            >
              Recent
            </button>
            <button 
              className={`transition-colors ${sortBy === 'created' ? 'font-medium' : ''}`}
              style={{ 
                color: sortBy === 'created' 
                  ? currentTheme.colors.accentPrimary 
                  : currentTheme.colors.textMuted 
              }}
              onClick={() => setSortBy('created')}
              aria-pressed={sortBy === 'created'}
              aria-label="Sort by creation date"
            >
              Created
            </button>
          </div>
        </div>
      </div>
      
      {/* Conversations list */}
      <div className="flex-grow overflow-y-auto modern-scrollbar">
        {isLoading ? (
          // Loading state
          <div className="flex flex-col items-center justify-center h-40" key="loading-state">
            <div 
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-3"
              style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
              aria-label="Loading conversations"
            ></div>
            <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
              Loading conversations...
            </p>
          </div>
        ) : !conversations || filteredConversations().length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center" key="empty-state">
            {searchQuery ? (
              // No search results
              <div key="no-search-results">
                <svg 
                  aria-hidden="true"
                  className="w-8 h-8 mb-3 opacity-60" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: currentTheme.colors.textMuted }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                  No conversations matching "{searchQuery}"
                </p>
                <button 
                  className="mt-3 text-xs font-medium"
                  style={{ color: currentTheme.colors.accentPrimary }}
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  Clear search
                </button>
              </div>
            ) : (
              // No conversations yet
              <div key="no-conversations">
                <svg 
                  aria-hidden="true"
                  className="w-8 h-8 mb-3 opacity-60" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: currentTheme.colors.textMuted }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
                  No conversations yet
                </p>
                <button 
                  className="mt-3 text-xs font-medium px-3 py-1 rounded-full"
                  style={{ 
                    color: currentTheme.colors.bgPrimary,
                    backgroundColor: currentTheme.colors.accentPrimary
                  }}
                  onClick={onNewConversation}
                  aria-label="Start chatting"
                >
                  Start chatting
                </button>
              </div>
            )}
          </div>
        ) : (
          // Conversations list
          <div className="p-2 space-y-1" key="conversations-list">
            {filteredConversations().map((conv) => (
              <div 
                key={conv.id}
                className="p-2.5 rounded-lg cursor-pointer transition-all relative group"
                style={{ 
                  backgroundColor: conv.id === activeConversationId 
                    ? `${currentTheme.colors.accentPrimary}15` 
                    : 'transparent',
                  borderLeft: conv.id === activeConversationId 
                    ? `2px solid ${currentTheme.colors.accentPrimary}` 
                    : `2px solid transparent`,
                }}
                onClick={() => onConversationSelect(conv.id)}
                aria-selected={conv.id === activeConversationId}
                role="option"
              >
                {/* Title (or edit mode) */}
                {editTitleId === conv.id ? (
                  <div 
                    className="mb-1 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      className="flex-grow p-1 rounded text-sm"
                      style={{
                        backgroundColor: `${currentTheme.colors.bgPrimary}80`,
                        color: currentTheme.colors.textPrimary,
                        border: `1px solid ${currentTheme.colors.borderColor}40`,
                      }}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => handleTitleKeyPress(e, conv.id)}
                      autoFocus
                      aria-label="Edit conversation title"
                    />
                    <Button
                      size="xs"
                      variant="ghost"
                      className="p-1"
                      onClick={() => handleSaveTitle(conv.id)}
                      aria-label="Save title"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="p-1"
                      onClick={handleCancelTitleEdit}
                      aria-label="Cancel edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <h4 
                      className="text-sm font-medium pr-6 flex-grow truncate"
                      style={{ 
                        color: conv.id === activeConversationId 
                          ? currentTheme.colors.textPrimary
                          : currentTheme.colors.textSecondary
                      }}
                    >
                      {conv.id === activeConversationId && (
                        <span 
                          className="inline-block w-2 h-2 rounded-full mr-1.5 mt-1.5"
                          style={{ backgroundColor: currentTheme.colors.success }}
                          aria-hidden="true"
                        />
                      )}
                      {conv.title}
                    </h4>
                    
                    {/* Action buttons */}
                    <div 
                      className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 top-2.5"
                      aria-hidden={!conv.id}
                    >
                      <button
                        className="p-1 rounded-full"
                        style={{
                          backgroundColor: `${currentTheme.colors.bgTertiary}90`,
                          color: currentTheme.colors.textMuted,
                        }}
                        onClick={(e) => handleEditTitleClick(e, conv.id, conv.title)}
                        title="Edit title"
                        aria-label="Edit conversation title"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        className={`p-1 rounded-full ml-1 ${
                          confirmDeleteId === conv.id ? '!opacity-100 !bg-red-500 !text-white' : ''
                        }`}
                        style={{
                          backgroundColor: confirmDeleteId === conv.id 
                            ? '#ef4444' 
                            : `${currentTheme.colors.bgTertiary}90`,
                          color: confirmDeleteId === conv.id 
                            ? 'white' 
                            : currentTheme.colors.textMuted,
                        }}
                        onClick={(e) => handleDelete(e, conv.id)}
                        disabled={deletingId === conv.id}
                        title={confirmDeleteId === conv.id ? "Confirm delete" : "Delete conversation"}
                        aria-label={confirmDeleteId === conv.id ? "Confirm delete" : "Delete conversation"}
                      >
                        {deletingId === conv.id ? (
                          <div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
                        ) : confirmDeleteId === conv.id ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Metadata/timestamp - hide in edit mode */}
                {editTitleId !== conv.id && (
                  <p 
                    className="text-xs truncate mt-0.5"
                    style={{ color: currentTheme.colors.textMuted }}
                  >
                    {formatDate(conv.updatedAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with features list */}
      <div 
        className="px-4 py-3 mt-auto border-t" 
        style={{ 
          borderColor: `${currentTheme.colors.borderColor}40`,
          background: `linear-gradient(to bottom, transparent, ${currentTheme.colors.bgTertiary}40)`,
        }}
      >
        <h4 
          className="text-xs uppercase tracking-wider font-medium mb-2 opacity-70"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          Features
        </h4>
        
        <div className="space-y-1.5 text-xs" style={{ color: currentTheme.colors.textSecondary }}>
          {features.map((feature) => (
            <div key={feature.id} className="flex items-center gap-1.5">
              <span 
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: feature.color }}
                aria-hidden="true"
              />
              <span>{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(ChatHistorySidebar, (prevProps, nextProps) => {
  // Only re-render if these props change
  return (
    prevProps.showSidebar === nextProps.showSidebar &&
    prevProps.activeConversationId === nextProps.activeConversationId &&
    prevProps.isLoading === nextProps.isLoading &&
    // A more efficient comparison for conversations
    (prevProps.conversations === nextProps.conversations ||
    (prevProps.conversations?.length === nextProps.conversations?.length &&
      JSON.stringify(prevProps.conversations) === JSON.stringify(nextProps.conversations)))
  );
});