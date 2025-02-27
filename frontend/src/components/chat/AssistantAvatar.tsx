import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface AssistantAvatarProps {
  isGenerating?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ 
  isGenerating = false,
  size = 'md',
  className = ''
}) => {
  const { currentTheme } = useTheme();
  
  // Size mappings
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  };
  
  // Generate a dragon-like icon that works with any theme
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex-shrink-0 mr-3 overflow-hidden relative shadow-lg ${className}`}
      style={{
        boxShadow: isGenerating 
          ? `0 0 0 2px ${currentTheme.colors.accentPrimary}40, 0 2px 10px rgba(0,0,0,0.15)` 
          : '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <div 
        className="absolute inset-0 bg-gradient-to-br opacity-90 z-0"
        style={{
          background: `linear-gradient(135deg, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`
        }}
      />
      
      <div className="absolute inset-0 flex items-center justify-center text-white z-10">
        {/* Dragon-like icon that adapts to theme */}
        <svg 
          className="w-5 h-5" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c.83 0 1.5.67 1.5 1.5S12.83 8 12 8s-1.5-.67-1.5-1.5S11.17 5 12 5zm2.5 9.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zM12 18c-3.31 0-6-2.69-6-6 0-.55.45-1 1-1s1 .45 1 1c0 2.21 1.79 4 4 4s4-1.79 4-4c0-.55.45-1 1-1s1 .45 1 1c0 3.31-2.69 6-6 6z" 
            fill="white" 
            fillOpacity="0.9"
          />
          <path 
            d="M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" 
            fill="white"
          />
        </svg>
      </div>
      
      {/* Spinner effect during generation */}
      {isGenerating && (
        <div
          className="absolute inset-0 rounded-full z-20"
          style={{
            background: `conic-gradient(transparent, transparent, white)`,
            animation: 'spin 1.5s linear infinite',
          }}
        />
      )}
      
      {/* Inner border */}
      <div 
        className="absolute inset-[2px] rounded-full z-5 opacity-60" 
        style={{
          background: `radial-gradient(circle at 30% 30%, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`
        }}
      />
    </div>
  );
};

export default AssistantAvatar;