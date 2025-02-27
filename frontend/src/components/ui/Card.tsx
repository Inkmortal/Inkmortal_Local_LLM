import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  noPadding?: boolean;
  borderAccent?: boolean;
  hoverEffect?: boolean;
  accentColor?: 'primary' | 'secondary' | 'tertiary';
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  noPadding = false,
  borderAccent = false,
  hoverEffect = false,
  accentColor = 'primary'
}) => {
  const { currentTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  // Determine accent color
  const getAccentColor = () => {
    switch (accentColor) {
      case 'secondary':
        return currentTheme.colors.accentSecondary;
      case 'tertiary':
        return currentTheme.colors.accentTertiary;
      default:
        return currentTheme.colors.accentPrimary;
    }
  };

  const accent = getAccentColor();

  return (
    <div 
      className={`rounded-xl shadow-md ${noPadding ? '' : 'p-5'} ${className} transition-all duration-300`}
      style={{
        backgroundColor: currentTheme.colors.bgSecondary,
        color: currentTheme.colors.textPrimary,
        borderLeft: borderAccent ? `4px solid ${accent}` : 'none',
        boxShadow: isHovered && hoverEffect 
          ? `0 10px 25px rgba(0, 0, 0, 0.1), 0 0 1px ${accent}60` 
          : `0 4px 15px rgba(0, 0, 0, 0.06)`,
        transform: isHovered && hoverEffect ? 'translateY(-4px)' : 'none',
      }}
      onMouseEnter={hoverEffect ? () => setIsHovered(true) : undefined}
      onMouseLeave={hoverEffect ? () => setIsHovered(false) : undefined}
    >
      {title && (
        <div className="mb-4 flex items-center">
          <div 
            className="w-1 h-5 rounded-full mr-2" 
            style={{ backgroundColor: accent }}
          />
          <h2 
            className="text-xl font-semibold"
            style={{ color: accent }}
          >
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;