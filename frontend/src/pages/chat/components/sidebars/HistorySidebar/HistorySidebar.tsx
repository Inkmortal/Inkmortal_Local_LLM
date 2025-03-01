import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import Button from '../../../../../components/ui/Button';
import { Conversation } from '../../../types/chat';

interface HistorySidebarProps {
  showHistorySidebar: boolean;
  toggleHistorySidebar: () => void;
  conversations: Conversation[];
  currentConversationId?: string;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  showHistorySidebar,
  toggleHistorySidebar,
  conversations,
  currentConversationId,
}) => {
  const { currentTheme } = useTheme();

  if (!showHistorySidebar) return null;

  return (
    <aside 
      className="flex-shrink-0 h-full transition-all w-64"
      style={{ 
        background: `linear-gradient(165deg, ${currentTheme.colors.bgSecondary}95, ${currentTheme.colors.bgTertiary}95)`,
        backdropFilter: 'blur(10px)',
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.07), 0 0 0 1px ${currentTheme.colors.borderColor}30`,
        borderRight: `1px solid ${currentTheme.colors.borderColor}30`,
        zIndex: 20,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Conversation History Section */}
      <div className="flex flex-col h-full">
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
            <svg className="w-4 h-4 mr-2 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Recent Chats
          </h3>
          <Button
            size="xs"
            variant="ghost"
            className="rounded-full p-1.5"
            style={{
              color: currentTheme.colors.textSecondary
            }}
            onClick={toggleHistorySidebar}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </Button>
        </div>
        
        {/* New chat button - moved to top for better visibility */}
        <button 
          className="w-[calc(100%-1rem)] mx-auto mt-3 p-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center"
          style={{ 
            background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}20, ${currentTheme.colors.accentSecondary}20)`,
            color: currentTheme.colors.textSecondary,
            border: `1px solid ${currentTheme.colors.borderColor}40`,
          }}
          onClick={() => window.location.href = '/chat'}
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Conversation
        </button>
        
        <div className="p-2 space-y-1.5 overflow-y-auto modern-scrollbar flex-grow">
          {/* Conversations list */}
          {conversations.map((conv, index) => (
            <div 
              key={conv.id}
              className="p-2.5 rounded-lg cursor-pointer transition-all relative overflow-hidden group"
              style={{ 
                backgroundColor: conv.id === currentConversationId 
                  ? `${currentTheme.colors.accentPrimary}15` 
                  : 'transparent',
                borderLeft: conv.id === currentConversationId 
                  ? `2px solid ${currentTheme.colors.accentPrimary}` 
                  : `2px solid transparent`,
              }}
              onClick={() => window.location.href = `/chat?conversation=${conv.id}`}
            >
              <h4 
                className="text-sm font-medium mb-1 flex items-center"
                style={{ 
                  color: conv.id === currentConversationId 
                    ? currentTheme.colors.textPrimary
                    : currentTheme.colors.textSecondary
                }}
              >
                {index === 0 ? (
                  <>
                    <span className="relative flex h-2 w-2 mr-2">
                      <span 
                        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
                        style={{ backgroundColor: currentTheme.colors.success }}
                      />
                      <span 
                        className="relative inline-flex rounded-full h-2 w-2" 
                        style={{ backgroundColor: currentTheme.colors.success }}
                      />
                    </span>
                    {conv.title}
                  </>
                ) : (
                  conv.title
                )}
              </h4>
              <p 
                className="text-xs truncate"
                style={{ color: currentTheme.colors.textMuted }}
              >
                {index === 0 
                  ? 'Active conversation' 
                  : `Started on ${conv.date.toLocaleDateString()}`}
              </p>
            </div>
          ))}
        </div>
      
        {/* Features Section */}
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
            Capabilities
          </h4>
          
          <div className="space-y-1.5 text-xs" style={{ color: currentTheme.colors.textSecondary }}>
            <div className="flex items-center gap-1.5">
              <span 
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentTheme.colors.accentPrimary }}
              />
              <span>Mathematical expression rendering</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span 
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentTheme.colors.accentSecondary }}
              />
              <span>Code syntax highlighting & execution</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span 
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentTheme.colors.accentTertiary }}
              />
              <span>Document uploading & analysis</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default HistorySidebar;