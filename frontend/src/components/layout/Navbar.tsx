import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ThemeSelector from '../ui/ThemeSelector';

interface NavbarProps {
  toggleSidebar: () => void;
  username?: string;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar, username }) => {
  const { currentTheme } = useTheme();
  const { logout } = useAuth();

  return (
    <header 
      className="h-16 fixed w-full flex items-center justify-between px-4 z-10"
      style={{
        backgroundColor: currentTheme.colors.bgSecondary,
        borderBottom: `1px solid ${currentTheme.colors.borderColor}`
      }}
    >
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 lg:hidden p-2 rounded-md"
          style={{ 
            color: currentTheme.colors.textPrimary,
            backgroundColor: `${currentTheme.colors.bgTertiary}40`
          }}
        >
          <svg 
            className="w-6 h-6" 
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
        <h1 className="text-xl font-semibold" style={{ color: currentTheme.colors.accentPrimary }}>
          Seadragon LLM Admin
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {username && (
          <div className="hidden sm:flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: currentTheme.colors.accentPrimary }}
            >
              <span style={{ color: 'white' }}>
                {username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-medium">{username}</span>
          </div>
        )}
        <ThemeSelector compact={true} />
        {username && (
          <button
            onClick={logout}
            className="p-2 rounded-md"
            title="Logout"
            style={{ 
              color: currentTheme.colors.error,
              backgroundColor: `${currentTheme.colors.error}10`
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
};

export default Navbar;