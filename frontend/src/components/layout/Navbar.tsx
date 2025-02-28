import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

interface NavbarProps {
  toggleSidebar: () => void;
  username?: string;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar, username: propUsername }) => {
  const { currentTheme } = useTheme();
  const { isAuthenticated, isAdmin, username: authUsername, logout } = useAuth();

  // Use the username from either props or auth context
  const username = propUsername || authUsername;

  const handleHomeClick = () => {
    window.navigateTo('/');  // Use client-side routing for consistent navigation
  };

  const handleLoginClick = () => {
    window.navigateTo('/login');
  };

  const handleRegisterClick = () => {
    window.navigateTo('/register');
  };

  const handleProfileClick = () => {
    window.navigateTo('/profile');
  };

  const handleAdminDashboardClick = () => {
    window.navigateTo('/admin');
  };

  return (
    <header 
      className="h-16 fixed w-full flex items-center justify-between px-6 z-30"
      style={{
        backgroundColor: `${currentTheme.colors.bgSecondary}CC`,
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${currentTheme.colors.borderColor}40`,
        boxShadow: `0 4px 20px rgba(0, 0, 0, 0.08)`
      }}
    >
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 lg:hidden p-2 rounded-lg transition-transform duration-200 hover:scale-105"
          style={{ 
            color: currentTheme.colors.textPrimary,
            backgroundColor: `${currentTheme.colors.bgTertiary}40`
          }}
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 6h16M4 12h16M4 18h16" 
            />
          </svg>
        </button>
        <div className="flex items-center cursor-pointer" onClick={handleHomeClick}>
          <svg 
            className="w-8 h-8 mr-3" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: currentTheme.colors.accentPrimary }}
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 11l3 3m0 0l-3 3m3-3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: currentTheme.colors.textPrimary }}>
              InkMortal Chat
            </h1>
            <div className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
              Cultivating Wisdom
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Profile/Avatar (when authenticated) */}
        {isAuthenticated && username && (
          <div 
            className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer" 
            style={{ 
              backgroundColor: `${currentTheme.colors.bgTertiary}30`,
              boxShadow: `0 2px 8px rgba(0, 0, 0, 0.05)`
            }}
            onClick={handleProfileClick}
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                boxShadow: `0 2px 8px ${currentTheme.colors.accentPrimary}40`
              }}
            >
              <span style={{ color: 'white' }}>
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{username}</span>
              <span className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
                {isAdmin ? 'Administrator' : 'User'}
              </span>
            </div>
          </div>
        )}
        
        {/* Home Button */}
        <Button 
          size="sm"
          variant="outline"
          onClick={handleHomeClick}
          style={{ color: currentTheme.colors.textPrimary }}
        >
          Home
        </Button>
        
        {/* Chat Button */}
        <Button 
          size="sm"
          variant="primary"
          onClick={() => window.navigateTo('/chat')}
        >
          Chat
        </Button>
        
        {/* Authentication Buttons */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            {/* Admin Dashboard Button (for admins only) */}
            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAdminDashboardClick}
              >
                Admin
              </Button>
            )}
            
            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-105"
              title="Logout"
              style={{ 
                color: currentTheme.colors.error,
                backgroundColor: `${currentTheme.colors.error}15`,
                boxShadow: `0 2px 8px ${currentTheme.colors.error}15`
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLoginClick}
            >
              Login
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRegisterClick}
            >
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;