import React from 'react';
import { Theme } from '../../context/ThemeContext';
import Card from '../ui/Card';

interface ThemeCardProps {
  theme: Theme;
  currentTheme: Theme;
  onClick: (theme: Theme) => void;
  isActive: boolean;
}

const ThemeCard: React.FC<ThemeCardProps> = ({ theme, currentTheme, onClick, isActive }) => {
  return (
    <div 
      className={`cursor-pointer transition-all duration-300 ${
        isActive ? 'ring-4' : 'hover:scale-105'
      } rounded-lg overflow-hidden`}
      style={{ 
        borderColor: isActive ? theme.colors.accentPrimary : currentTheme.colors.borderColor,
        boxShadow: isActive ? `0 0 12px ${theme.colors.accentPrimary}40` : 'none'
      }}
      onClick={() => onClick(theme)}
    >
      <Card className="h-full">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">{theme.displayName}</h3>
          <span 
            className="w-5 h-5 rounded-full"
            style={{ backgroundColor: theme.colors.accentPrimary }}
          />
        </div>
        
        <div 
          className="p-4 rounded-md mb-3"
          style={{ 
            backgroundColor: theme.colors.bgPrimary,
            border: `1px solid ${theme.colors.borderColor}`
          }}
        >
          <div 
            className="h-3 w-24 rounded-full mb-2"
            style={{ backgroundColor: theme.colors.accentPrimary }}
          />
          <div 
            className="h-2 w-full rounded-full mb-2"
            style={{ backgroundColor: theme.colors.bgTertiary }}
          />
          <div 
            className="h-2 w-3/4 rounded-full"
            style={{ backgroundColor: theme.colors.bgTertiary }}
          />
        </div>
        
        <div className="flex gap-1.5 mt-auto">
          <span 
            className="inline-block w-4 h-4 rounded-full"
            style={{ backgroundColor: theme.colors.accentPrimary }}
            title="Accent Primary"
          />
          <span 
            className="inline-block w-4 h-4 rounded-full"
            style={{ backgroundColor: theme.colors.accentSecondary }}
            title="Accent Secondary"
          />
          <span 
            className="inline-block w-4 h-4 rounded-full"
            style={{ backgroundColor: theme.colors.accentTertiary }}
            title="Accent Tertiary"
          />
          <div className="ml-auto">
            <span className="text-xs opacity-70">{theme.isDark ? 'Dark' : 'Light'}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ThemeCard;