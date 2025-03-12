// This is a fixed version of ChatHistorySidebar.tsx with key props added to conditionally rendered elements

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

const ChatHistorySidebarFixed: React.FC<ChatHistorySidebarProps> = ({
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
  
  // Filter and sort conversations based on search and sort settings
  const filteredConversations = useCallback(() => {
    if (!conversations) return [];
    
    return conversations
      .filter(conv => {
        if (!searchQuery.trim()) return true;
        
        return conv.title.toLowerCase().includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        if (sortBy === 'updated') {
          return b.updatedAt - a.updatedAt;
        } else {
          return b.createdAt - a.createdAt;
        }
      });
  }, [conversations, searchQuery, sortBy]);
  
  // Handler for editing conversation titles
  const handleEditTitleClick = useCallback((e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    setEditTitleId(id);
    setNewTitle(currentTitle);
  }, []);
  
  // Handler for title edit keyboard events
  const handleTitleKeyPress = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle(id);
    } else if (e.key === 'Escape') {
      handleCancelTitleEdit();
    }
  }, []);
  
  // Handler for saving edited titles
  const handleSaveTitle = useCallback(async (id: string) => {
    if (!newTitle.trim()) {
      handleCancelTitleEdit();
      return;
    }
    
    try {
      const result = await updateConversationTitle(id, newTitle);
      
      if (result.success) {
        setEditTitleId(null);
        setNewTitle('');
        debouncedRefresh();
        showSuccess('Conversation title updated');
      } else {
        showError(`Failed to update title: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating title:', error);
      showError('Failed to update conversation title');
    }
  }, [newTitle, onRefreshConversations]);
  
  // Handler for cancelling title edits
  const handleCancelTitleEdit = useCallback(() => {
    setEditTitleId(null);
    setNewTitle('');
  }, []);
  
  // Handler for initiating conversation deletion
  const handleDeleteClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
    
    // Auto-cancel after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setConfirmDeleteId(null);
    }, 5000);
  }, []);
  
  // Handler for confirming deletion
  const handleConfirmDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Set deleting state for UI feedback
    setDeletingId(id);
    
    try {
      const result = await deleteConversation(id);
      
      if (result.success) {
        setConfirmDeleteId(null);
        setDeletingId(null);
        debouncedRefresh();
        showSuccess('Conversation deleted');
        
        // If the active conversation was deleted, create a new one
        if (id === activeConversationId) {
          onNewConversation();
        }
      } else {
        setConfirmDeleteId(null);
        setDeletingId(null);
        showError(`Failed to delete conversation: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setConfirmDeleteId(null);
      setDeletingId(null);
      showError('Failed to delete conversation');
    }
  }, [activeConversationId, onNewConversation, onRefreshConversations]);
  
  // Handler for cancelling deletion
  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setConfirmDeleteId(null);
  }, []);
  
  // Track last refresh time to prevent excessive API calls
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const REFRESH_DEBOUNCE_MS = 5000; // Only allow refreshes every 5 seconds
  
  // Debounced refresh function to prevent excessive API calls
  const debouncedRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    // If we recently refreshed, debounce
    if (timeSinceLastRefresh < REFRESH_DEBOUNCE_MS) {
      console.log(`Debouncing conversation refresh. Last refresh was ${timeSinceLastRefresh}ms ago`);
      
      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      // Schedule a refresh after the debounce period
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('Executing debounced conversation refresh');
        lastRefreshTimeRef.current = Date.now();
        onRefreshConversations();
        refreshTimeoutRef.current = null;
      }, REFRESH_DEBOUNCE_MS - timeSinceLastRefresh);
      
      return;
    }
    
    // Otherwise, refresh immediately
    console.log('Executing immediate conversation refresh');
    lastRefreshTimeRef.current = now;
    onRefreshConversations();
  }, [onRefreshConversations]);
  

  // Only refresh on initial mount, not on visibility changes
  useEffect(() => {
    // Load conversations only once when component mounts
    if (conversations === null && !isLoading) {
      console.log("Initial load of conversations");
      onRefreshConversations();
    }
  }, [conversations, isLoading, onRefreshConversations]);

  // Just handle UI state when visibility changes, dont refresh
  useEffect(() => {
    if (!showSidebar) {
      // When hiding, reset UI state
      setConfirmDeleteId(null);
      setDeletingId(null);
      setEditTitleId(null);
      setNewTitle("");
    }
    
    // Cleanup function to prevent memory leaks
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [showSidebar]);  // Removed onRefreshConversations from deps
  
  // Don't render if sidebar is hidden
  if (!showSidebar) return null;
  
  // Define features for the features list
  const features = [
    { id: 'math', label: 'Math expressions', color: currentTheme.colors.accentPrimary },
    { id: 'code', label: 'Code syntax highlighting', color: currentTheme.colors.accentSecondary },
    { id: 'docs', label: 'Document uploading', color: currentTheme.colors.accentTertiary }
  ];
  
  // Create the content for the conversations list based on state
  const getContentToRender = () => {
    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-40">
          <div 
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-3"
            style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
            aria-label="Loading conversations"
          ></div>
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
            Loading conversations...
          </p>
        </div>
      );
    }
    
    // Empty state - no conversations or search with no results
    if (!conversations || filteredConversations().length === 0) {
      if (searchQuery) {
        // No search results
        return (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <svg className="w-6 h-6 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: currentTheme.colors.textMuted }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
              No conversations found matching "{searchQuery}"
            </p>
            <button
              className="mt-3 text-xs font-medium rounded-md px-2 py-1"
              style={{ color: currentTheme.colors.accentPrimary }}
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </button>
          </div>
        );
      } else {
        // No conversations at all
        return (
          <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
            <svg className="w-6 h-6 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ color: currentTheme.colors.textMuted }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
              No conversations yet
            </p>
            <button
              className="mt-3 text-xs font-medium rounded-md px-2 py-1"
              style={{ 
                color: '#fff',
                backgroundColor: currentTheme.colors.accentPrimary
              }}
              onClick={onNewConversation}
            >
              Start a new conversation
            </button>
          </div>
        );
      }
    }
    
    // List of conversations
    return (
      <div className="mt-2.5 space-y-1.5">
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
                key={`edit-${conv.id}`}
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
              <div key={`view-${conv.id}`} className="flex items-start justify-between">
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
                      key={`active-indicator-${conv.id}`}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  
                  {/* Delete button with confirmation */}
                  {confirmDeleteId === conv.id ? (
                    <div key={`confirm-${conv.id}`} className="flex items-center pl-1">
                      <button
                        className="p-1 rounded-full"
                        style={{
                          backgroundColor: `${currentTheme.colors.error}20`,
                          color: currentTheme.colors.error,
                        }}
                        onClick={(e) => handleConfirmDelete(e, conv.id)}
                        disabled={deletingId === conv.id}
                        title="Confirm delete"
                        aria-label="Confirm delete conversation"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        className="p-1 rounded-full"
                        style={{
                          backgroundColor: `${currentTheme.colors.bgTertiary}90`,
                          color: currentTheme.colors.textMuted,
                        }}
                        onClick={handleCancelDelete}
                        title="Cancel delete"
                        aria-label="Cancel delete conversation"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      key={`delete-${conv.id}`}
                      className="p-1 rounded-full ml-1"
                      style={{
                        backgroundColor: `${currentTheme.colors.bgTertiary}90`,
                        color: currentTheme.colors.textMuted,
                      }}
                      onClick={(e) => handleDeleteClick(e, conv.id)}
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {/* Timestamp - only show if not editing */}
            {editTitleId !== conv.id && (
              <div 
                key={`timestamp-${conv.id}`}
                className="text-xs opacity-70 mt-1"
                style={{ color: currentTheme.colors.textMuted }}
              >
                {new Date(conv.updatedAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            )}
            
            {/* Deleting indicator overlay */}
            {deletingId === conv.id && (
              <div 
                key={`deleting-${conv.id}`}
                className="absolute inset-0 flex items-center justify-center rounded-lg"
                style={{ backgroundColor: `${currentTheme.colors.bgPrimary}80` }}
              >
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3.5 h-3.5 rounded-full animate-spin"
                    style={{ 
                      border: `2px solid ${currentTheme.colors.borderColor}40`,
                      borderTopColor: currentTheme.colors.error 
                    }}
                  ></div>
                  <span 
                    className="text-xs font-medium"
                    style={{ color: currentTheme.colors.textSecondary }}
                  >
                    Deleting...
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div
      className="h-full flex flex-col border-r overflow-hidden transition-all"
      style={{
        width: '280px',
        borderColor: `${currentTheme.colors.borderColor}20`,
        backgroundColor: currentTheme.colors.bgPrimary,
      }}
    >
      {/* Heading + New Chat button */}
      <div className="p-3 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="text-base font-semibold truncate"
            style={{ color: currentTheme.colors.textPrimary }}
          >
            Conversations
          </h2>
          <div className="flex items-center space-x-1">
            <Button
              onClick={onNewConversation}
              className="flex items-center rounded-lg px-3 py-1.5 text-sm"
              style={{
                backgroundColor: currentTheme.colors.accentPrimary,
                color: '#fff',
                boxShadow: `0 2px 5px ${currentTheme.colors.accentPrimary}40`
              }}
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New</span>
            </Button>
            <Button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg"
              style={{
                backgroundColor: `${currentTheme.colors.bgTertiary}50`,
                color: currentTheme.colors.textSecondary,
              }}
              aria-label="Close sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
        
        {/* Search and Sort controls */}
        <div className="relative mb-3">
          <input
            type="text"
            className="w-full py-2 pl-9 pr-4 rounded-lg text-sm shadow-sm"
            placeholder="Search conversations..."
            style={{
              backgroundColor: `${currentTheme.colors.bgSecondary}80`,
              color: currentTheme.colors.textPrimary,
              border: `1px solid ${currentTheme.colors.borderColor}30`,
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <svg
            className="absolute left-3 top-2.5 w-4 h-4"
            style={{ color: currentTheme.colors.textMuted }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {searchQuery && (
            <button
              className="absolute right-3 top-2.5 text-opacity-70 hover:text-opacity-100"
              style={{ color: currentTheme.colors.textMuted }}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Sort controls */}
        <div className="flex text-xs mb-1.5">
          <span 
            className="mr-2"
            style={{ color: currentTheme.colors.textMuted }}
          >
            Sort by:
          </span>
          <button
            className={`mr-3 ${sortBy === 'updated' ? 'font-medium' : ''}`}
            style={{ 
              color: sortBy === 'updated' 
                ? currentTheme.colors.accentPrimary 
                : currentTheme.colors.textMuted
            }}
            onClick={() => setSortBy('updated')}
          >
            Last updated
          </button>
          <button
            className={sortBy === 'created' ? 'font-medium' : ''}
            style={{ 
              color: sortBy === 'created' 
                ? currentTheme.colors.accentPrimary 
                : currentTheme.colors.textMuted
            }}
            onClick={() => setSortBy('created')}
          >
            Created date
          </button>
        </div>
      </div>
      
      {/* Conversation list with custom scrollbar */}
      <div className="flex-grow overflow-y-auto px-3 modern-scrollbar">
        {/* Dynamic content based on state */}
        {getContentToRender()}
      </div>
      
      {/* Features list footer */}
      <div 
        className="mt-auto p-3 border-t"
        style={{ borderColor: `${currentTheme.colors.borderColor}20` }}
      >
        <h3 
          className="text-xs font-medium mb-2"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          Available features
        </h3>
        <div className="space-y-1.5">
          {features.map((feature) => (
            <div key={feature.id} className="flex items-center gap-1.5">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: feature.color }}
              ></span>
              <span 
                className="text-xs"
                style={{ color: currentTheme.colors.textMuted }}
              >
                {feature.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(ChatHistorySidebarFixed);