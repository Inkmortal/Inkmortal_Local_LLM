import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  noPadding?: boolean;
  borderAccent?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  className = '',
  noPadding = false,
  borderAccent = false
}) => {
  const { currentTheme } = useTheme();

  return (
    <div 
      className={`rounded-lg shadow-md ${noPadding ? '' : 'p-4'} ${className}`}
      style={{
        backgroundColor: currentTheme.colors.bgSecondary,
        color: currentTheme.colors.textPrimary,
        borderLeft: borderAccent ? `4px solid ${currentTheme.colors.accentPrimary}` : 'none'
      }}
    >
      {title && (
        <h2 
          className="text-xl font-semibold mb-3"
          style={{ color: currentTheme.colors.accentPrimary }}
        >
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export default Card;