import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import Button from '../../../../components/ui/Button';
import ThemeSelector from '../../../../components/ui/ThemeSelector';

interface ChatHeaderProps {
  showHistorySidebar: boolean;
  toggleHistorySidebar: () => void;
  toggleSidebar: () => void;
  showSidebar: boolean;
  isAuthenticated: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  showHistorySidebar,
  toggleHistorySidebar,
  toggleSidebar,
  showSidebar,
  isAuthenticated,
}) => {
  const { currentTheme } = useTheme();

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
          onClick={() => window.navigateTo('/')}
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
          <div className="text-xs font-light" style={{ color: currentTheme.colors.textMuted }}>
            Ancient Cultivation Wisdom
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* New conversation button - more exciting and prominent */}
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
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Chat
        </Button>

        {/* Artifact Panel button */}
        <Button 
          size="sm"
          variant="ghost"
          className="text-sm rounded-lg"
          style={{
            color: showSidebar ? currentTheme.colors.accentPrimary : currentTheme.colors.textSecondary,
            backgroundColor: showSidebar ? `${currentTheme.colors.accentPrimary}10` : 'transparent',
          }}
          onClick={toggleSidebar}
          title="View artifacts and uploads"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </Button>
        
        {isAuthenticated && (
          <Button 
            size="sm"
            variant="ghost"
            onClick={() => window.navigateTo('/admin')}
            className="text-sm transition-all rounded-lg"
            style={{
              color: currentTheme.colors.textSecondary,
              background: `${currentTheme.colors.bgTertiary}60`,
            }}
          >
            Admin
          </Button>
        )}
        <ThemeSelector />
      </div>
    </header>
  );
};

export default ChatHeader;