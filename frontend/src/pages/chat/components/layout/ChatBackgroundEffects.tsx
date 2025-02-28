import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ChatBackgroundEffects: React.FC = () => {
  const { currentTheme } = useTheme();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient sphere 1 */}
      <div 
        className="absolute rounded-full opacity-15 blur-3xl" 
        style={{
          width: '40vw',
          height: '40vw',
          top: '20%',
          left: '-10%',
          background: `radial-gradient(circle, ${currentTheme.colors.accentPrimary}40, transparent 70%)`,
          filter: 'blur(120px)',
        }}
      />
      
      {/* Gradient sphere 2 */}
      <div 
        className="absolute rounded-full opacity-10 blur-3xl" 
        style={{
          width: '45vw',
          height: '45vw',
          bottom: '-10%',
          right: '-5%',
          background: `radial-gradient(circle, ${currentTheme.colors.accentSecondary}30, transparent 70%)`,
          filter: 'blur(120px)',
        }}
      />
    </div>
  );
};

export default ChatBackgroundEffects;