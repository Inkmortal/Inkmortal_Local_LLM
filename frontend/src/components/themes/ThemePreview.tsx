import React from 'react';
import { Theme } from '../../context/ThemeContext';
import Card from '../ui/Card';

interface ThemePreviewProps {
  theme: Theme;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ theme }) => {
  return (
    <Card title="Preview">
      <div 
        className="p-4 rounded-lg"
        style={{
          backgroundColor: theme.colors.bgPrimary,
          color: theme.colors.textPrimary,
          border: `1px solid ${theme.colors.borderColor}`
        }}
      >
        <h3 
          className="text-lg font-medium mb-3"
          style={{ color: theme.colors.accentPrimary }}
        >
          Theme Preview
        </h3>
        
        <p style={{ color: theme.colors.textPrimary }}>
          This is how your text will appear with the primary text color.
        </p>
        
        <p className="mt-2" style={{ color: theme.colors.textSecondary }}>
          Secondary text looks like this.
        </p>
        
        <p className="mt-2" style={{ color: theme.colors.textMuted }}>
          And this is how muted text will appear.
        </p>
        
        <div 
          className="mt-4 p-3 rounded-md"
          style={{ backgroundColor: theme.colors.bgSecondary }}
        >
          <p>This is a secondary background element.</p>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded-md"
            style={{ 
              backgroundColor: theme.colors.accentPrimary,
              color: theme.isDark ? 'white' : 'black'
            }}
          >
            Primary Button
          </button>
          
          <button
            className="px-3 py-1.5 rounded-md"
            style={{ 
              backgroundColor: theme.colors.accentSecondary,
              color: theme.isDark ? 'white' : 'black'
            }}
          >
            Secondary
          </button>
          
          <button
            className="px-3 py-1.5 rounded-md"
            style={{ 
              backgroundColor: theme.colors.accentTertiary,
              color: theme.isDark ? 'white' : 'black'
            }}
          >
            Tertiary
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ThemePreview;