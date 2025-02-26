import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import ThemeSelector from '../ui/ThemeSelector';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { currentTheme } = useTheme();

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

      <div className="flex items-center">
        <ThemeSelector />
      </div>
    </header>
  );
};

export default Navbar;