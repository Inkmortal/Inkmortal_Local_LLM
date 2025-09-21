import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import Button from '../../../../components/ui/Button';
import ThemeSelector from '../../../../components/ui/ThemeSelector';
import ROUTES from '../../../../routes.constants';
import { fetchModelInfo } from '../../../../services/chat';

interface ChatHeaderProps {
  showHistorySidebar: boolean;
  toggleHistorySidebar: () => void;
  toggleSidebar: () => void;
  showSidebar: boolean;
  conversationTitle?: string;
  onUpdateTitle?: (title: string) => Promise<void>;
  canUpdateTitle?: boolean;
  queuePosition?: number;
  isQueueLoading?: boolean;
  isProcessing?: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  showHistorySidebar,
  toggleHistorySidebar,
  toggleSidebar,
  showSidebar,
  conversationTitle = 'New Conversation',
  onUpdateTitle,
  canUpdateTitle = false,
  queuePosition = 0,
  isQueueLoading = false,
  isProcessing = false,
}) => {
  const { currentTheme } = useTheme();
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [modelName, setModelName] = useState<string>('Local LLM');
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(conversationTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Update newTitle when conversationTitle changes (from parent)
  useEffect(() => {
    setNewTitle(conversationTitle);
  }, [conversationTitle]);
  
  // Fetch current model name and system status using the public endpoint
  useEffect(() => {
    const getModelInfo = async () => {
      try {
        const modelInfo = await fetchModelInfo();
        if (modelInfo) {
          // Set system status
          setSystemStatus(modelInfo.status);
          
          // Set model name
          if (modelInfo.model) {
            setModelName(modelInfo.model);
          }
        }
      } catch (error) {
        console.error('Error fetching model info:', error);
        setSystemStatus('unknown');
      }
    };
    
    getModelInfo();
    
    // Refresh every 2 minutes (more frequent to catch model changes)
    const intervalId = setInterval(getModelInfo, 2 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle title edit start
  const handleTitleClick = () => {
    if (canUpdateTitle && onUpdateTitle) {
      setEditingTitle(true);
      // Focus input after render
      setTimeout(() => titleInputRef.current?.focus(), 10);
    }
  };
  
  // Handle title save
  const handleTitleSave = async () => {
    if (onUpdateTitle && newTitle.trim()) {
      await onUpdateTitle(newTitle.trim());
    }
    setEditingTitle(false);
  };
  
  // Handle title input key events
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setNewTitle(conversationTitle);
      setEditingTitle(false);
    }
  };
  
  // Create a new conversation
  const handleNewChat = () => {
    navigate('/chat');
    // Navigation will trigger state reset in ChatRouter
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    if (isQueueLoading) {
      return (
        <div className="flex items-center ml-2 px-1.5 py-0.5 rounded-sm text-[10px] font-medium animate-pulse"
          style={{ 
            backgroundColor: `${currentTheme.colors.warning}20`, 
            color: currentTheme.colors.warning
          }}
        >
          <span className="mr-1">Queue: {queuePosition}</span>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentTheme.colors.warning }}
          ></div>
        </div>
      );
    } else if (isProcessing) {
      return (
        <div className="flex items-center ml-2 px-1.5 py-0.5 rounded-sm text-[10px] font-medium animate-pulse"
          style={{ 
            backgroundColor: `${currentTheme.colors.info}20`, 
            color: currentTheme.colors.info
          }}
        >
          <span className="mr-1">Processing</span>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentTheme.colors.info }}
          ></div>
        </div>
      );
    } else if (systemStatus === 'offline') {
      return (
        <div className="flex items-center ml-2 px-1.5 py-0.5 rounded-sm text-[10px] font-medium"
          style={{ 
            backgroundColor: `${currentTheme.colors.error}20`, 
            color: currentTheme.colors.error
          }}
        >
          <span className="mr-1">Offline</span>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: currentTheme.colors.error }}
          ></div>
        </div>
      );
    }
    return null;
  };

  return (
    <header 
      className="py-3 px-4 md:px-6 flex justify-between items-center z-10 sticky top-0"
      style={{ 
        background: `linear-gradient(to bottom, ${currentTheme.colors.bgSecondary}AA, ${currentTheme.colors.bgPrimary}90)`,
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${currentTheme.colors.borderColor}30`,
        boxShadow: `0 4px 16px rgba(0, 0, 0, 0.08)`,
      }}
    >
      <div className="flex items-center space-x-3">
        {/* Toggle History Sidebar Button (only shows when sidebar is closed) */}
        {!showHistorySidebar && (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full p-1.5"
            style={{
              color: currentTheme.colors.textSecondary
            }}
            onClick={toggleHistorySidebar}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </Button>
        )}
        
        {/* Home button that uses client-side navigation */}
        <Button 
          size="sm"
          variant="ghost"
          className="rounded-lg transition-all"
          style={{
            color: currentTheme.colors.textSecondary,
            backgroundColor: `${currentTheme.colors.bgTertiary}40`,
          }}
          onClick={() => navigate(ROUTES.HOME)}
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7" />
          </svg>
          Home
        </Button>

        <div>
          <div className="flex items-baseline">
            <span 
              className="text-lg font-semibold" 
              style={{ 
                background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Sea Dragon Inkmortal
            </span>
            <span className="ml-1.5 text-sm font-medium" style={{ color: currentTheme.colors.textPrimary }}>
              Chat
            </span>
          </div>
          
          {/* Conversation title (editable) */}
          {editingTitle ? (
            <div className="flex items-center mt-1">
              <input
                ref={titleInputRef}
                type="text"
                className="text-xs py-1 px-2 rounded w-48"
                style={{ 
                  backgroundColor: `${currentTheme.colors.bgSecondary}`,
                  color: currentTheme.colors.textPrimary,
                  border: `1px solid ${currentTheme.colors.borderColor}`
                }}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                maxLength={48}
              />
              <Button
                size="xs"
                variant="ghost"
                className="ml-1 p-1"
                onClick={handleTitleSave}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </Button>
            </div>
          ) : (
            <div 
              className={`text-xs font-medium flex items-center ${canUpdateTitle ? 'cursor-pointer group' : ''}`}
              style={{ color: currentTheme.colors.textMuted }}
              onClick={canUpdateTitle ? handleTitleClick : undefined}
            >
              <span>{conversationTitle}</span>
              {canUpdateTitle && (
                <svg 
                  className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-70 transition-opacity" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              )}
              <span className="ml-2 px-1.5 py-0.5 rounded-sm text-[10px] font-medium flex items-center" 
                style={{ 
                  backgroundColor: `${currentTheme.colors.accentPrimary}20`,
                  color: currentTheme.colors.accentPrimary
                }}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full mr-1"
                  style={{ 
                    backgroundColor: systemStatus === 'online' 
                      ? currentTheme.colors.success 
                      : systemStatus === 'offline'
                        ? currentTheme.colors.error
                        : currentTheme.colors.warning
                  }}
                ></div>
                {modelName}
              </span>
              
              {/* Status indicators (queue, processing, etc.) */}
              {renderStatusIndicator()}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Page specific actions in consistent order */}
        
        {/* 1. New conversation button */}
        <Button 
          size="sm"
          variant="default"
          className="text-sm rounded-lg hover:scale-105 transition-transform duration-200 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
            color: '#fff',
            borderColor: 'transparent',
            boxShadow: `0 4px 12px ${currentTheme.colors.accentPrimary}40`,
          }}
          onClick={handleNewChat}
        >
          <svg className="w-4 h-4 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="hidden sm:inline">New Chat</span>
        </Button>

        {/* 2. Artifact Panel button */}
        <Button 
          size="sm"
          variant="ghost"
          className="text-sm rounded-lg flex items-center gap-1.5"
          style={{
            color: showSidebar ? currentTheme.colors.accentPrimary : currentTheme.colors.textSecondary,
            backgroundColor: showSidebar ? `${currentTheme.colors.accentPrimary}10` : 'transparent',
          }}
          onClick={toggleSidebar}
          title="View artifacts and uploads"
        >
          <svg className="w-4 h-4 sm:mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="hidden sm:inline">Artifacts</span>
        </Button>
        
        {/* 3. Theme selector - always visible */}
        <ThemeSelector />
        
        {/* 4. Admin button - only visible to admin users */}
        {isAuthenticated && isAdmin && (
          <Button 
            size="sm"
            variant="ghost"
            onClick={() => navigate(ROUTES.ADMIN.ROOT)}
            className="text-sm transition-all rounded-lg"
            style={{
              color: currentTheme.colors.textSecondary,
              background: `${currentTheme.colors.bgTertiary}60`,
            }}
          >
            <span className="hidden sm:inline">Admin</span>
            <span className="sm:hidden">A</span>
          </Button>
        )}
        
        {/* 5. Logout button - visible to all authenticated users */}
        {isAuthenticated && (
          <Button
            size="sm"
            variant="ghost"
            onClick={logout}
            className="text-sm transition-all rounded-lg"
            style={{
              color: currentTheme.colors.error,
              background: `${currentTheme.colors.error}15`,
            }}
            title="Logout"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
            <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </Button>
        )}
      </div>
    </header>
  );
};

export default ChatHeader;