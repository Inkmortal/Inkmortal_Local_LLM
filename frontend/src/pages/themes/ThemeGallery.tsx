import React, { useState } from 'react';
import { useTheme, Theme, ThemeName, themes } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// Define common popular themes that users might want to try
const popularThemes = [
  {
    name: 'github-dark',
    displayName: 'GitHub Dark',
    colors: {
      bgPrimary: '#0d1117',
      bgSecondary: '#161b22',
      bgTertiary: '#21262d',
      textPrimary: '#c9d1d9',
      textSecondary: '#8b949e',
      textMuted: '#6e7681',
      accentPrimary: '#58a6ff',
      accentSecondary: '#bc8cff',
      accentTertiary: '#f778ba',
      borderColor: '#30363d',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149'
    },
    isDark: true
  },
  {
    name: 'github-light',
    displayName: 'GitHub Light',
    colors: {
      bgPrimary: '#ffffff',
      bgSecondary: '#f6f8fa',
      bgTertiary: '#eaeef2',
      textPrimary: '#24292f',
      textSecondary: '#57606a',
      textMuted: '#6e7781',
      accentPrimary: '#0969da',
      accentSecondary: '#8250df',
      accentTertiary: '#bf3989',
      borderColor: '#d0d7de',
      success: '#1a7f37',
      warning: '#9a6700',
      error: '#cf222e'
    },
    isDark: false
  },
  {
    name: 'solarized-dark',
    displayName: 'Solarized Dark',
    colors: {
      bgPrimary: '#002b36',
      bgSecondary: '#073642',
      bgTertiary: '#586e75',
      textPrimary: '#93a1a1',
      textSecondary: '#839496',
      textMuted: '#657b83',
      accentPrimary: '#268bd2',
      accentSecondary: '#6c71c4',
      accentTertiary: '#d33682',
      borderColor: '#073642',
      success: '#859900',
      warning: '#b58900',
      error: '#dc322f'
    },
    isDark: true
  },
  {
    name: 'solarized-light',
    displayName: 'Solarized Light',
    colors: {
      bgPrimary: '#fdf6e3',
      bgSecondary: '#eee8d5',
      bgTertiary: '#93a1a1',
      textPrimary: '#586e75',
      textSecondary: '#657b83',
      textMuted: '#839496',
      accentPrimary: '#268bd2',
      accentSecondary: '#6c71c4',
      accentTertiary: '#d33682',
      borderColor: '#eee8d5',
      success: '#859900',
      warning: '#b58900',
      error: '#dc322f'
    },
    isDark: false
  },
  {
    name: 'gruvbox-dark',
    displayName: 'Gruvbox Dark',
    colors: {
      bgPrimary: '#282828',
      bgSecondary: '#32302f',
      bgTertiary: '#45403d',
      textPrimary: '#ebdbb2',
      textSecondary: '#d5c4a1',
      textMuted: '#bdae93',
      accentPrimary: '#83a598',
      accentSecondary: '#d3869b',
      accentTertiary: '#fabd2f',
      borderColor: '#3c3836',
      success: '#b8bb26',
      warning: '#fe8019',
      error: '#fb4934'
    },
    isDark: true
  },
  {
    name: 'one-dark',
    displayName: 'One Dark',
    colors: {
      bgPrimary: '#282c34',
      bgSecondary: '#21252b',
      bgTertiary: '#333842',
      textPrimary: '#abb2bf',
      textSecondary: '#9da5b4',
      textMuted: '#6b717d',
      accentPrimary: '#61afef',
      accentSecondary: '#c678dd',
      accentTertiary: '#e06c75',
      borderColor: '#181a1f',
      success: '#98c379',
      warning: '#e5c07b',
      error: '#e06c75'
    },
    isDark: true
  },
  {
    name: 'synthwave',
    displayName: 'Synthwave',
    colors: {
      bgPrimary: '#262335',
      bgSecondary: '#241b2f',
      bgTertiary: '#2a2139',
      textPrimary: '#f5f5f7',
      textSecondary: '#d8e0f0',
      textMuted: '#a09bb3',
      accentPrimary: '#f97e72',
      accentSecondary: '#ff7edb',
      accentTertiary: '#36f9f6',
      borderColor: '#3c2e58',
      success: '#72f1b8',
      warning: '#fede5d',
      error: '#fe4450'
    },
    isDark: true
  },
  {
    name: 'nightfly',
    displayName: 'Nightfly',
    colors: {
      bgPrimary: '#011627',
      bgSecondary: '#0e293f',
      bgTertiary: '#1d3b53',
      textPrimary: '#c3ccdc',
      textSecondary: '#a2aabc',
      textMuted: '#637777',
      accentPrimary: '#82aaff',
      accentSecondary: '#c792ea',
      accentTertiary: '#ff5874',
      borderColor: '#1d3b53',
      success: '#a1cd5e',
      warning: '#ecc48d',
      error: '#ff5874'
    },
    isDark: true
  }
];

// Combine built-in themes with popular themes
const allThemes = {...themes};
popularThemes.forEach(theme => {
  if (!allThemes[theme.name]) {
    allThemes[theme.name as ThemeName] = theme as Theme;
  }
});

const ThemeGallery: React.FC = () => {
  const { currentTheme, setTheme, customTheme, setCustomTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  
  // Theme card renderer
  const renderThemeCard = (theme: Theme) => {
    const isActive = currentTheme.name === theme.name;
    
    return (
      <div 
        key={theme.name} 
        className={`cursor-pointer transition-all duration-300 ${
          isActive ? 'ring-4' : 'hover:scale-105'
        } rounded-lg overflow-hidden`}
        style={{ 
          borderColor: isActive ? theme.colors.accentPrimary : currentTheme.colors.borderColor,
          boxShadow: isActive ? `0 0 12px ${theme.colors.accentPrimary}40` : 'none'
        }}
        onClick={() => {
          setTheme(theme.name);
          setSelectedTheme(theme);
        }}
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
  
  return (
    <div className="min-h-screen py-16 px-4" style={{ backgroundColor: currentTheme.colors.bgPrimary, color: currentTheme.colors.textPrimary }}>
      <div className="fixed top-4 right-4 z-10">
        <Button 
          size="sm"
          variant="outline"
          onClick={() => window.navigateTo('/')}
        >
          Back to Home
        </Button>
      </div>
      
      <div className="container mx-auto max-w-6xl">
        <h1 
          className="text-4xl font-bold mb-2 text-center"
          style={{ color: currentTheme.colors.accentPrimary }}
        >
          Theme Gallery
        </h1>
        <p 
          className="text-xl mb-8 text-center max-w-2xl mx-auto"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          Explore different themes for your Seadragon LLM experience
        </p>
        
        <div className="mb-8">
          <h2 
            className="text-2xl font-semibold mb-6"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            Default Themes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.keys(themes).map(name => renderThemeCard(themes[name as ThemeName]))}
          </div>
        </div>
        
        <div className="mb-8">
          <h2 
            className="text-2xl font-semibold mb-6"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            Popular Themes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {popularThemes.map(theme => renderThemeCard(theme as Theme))}
          </div>
        </div>
        
        {customTheme && (
          <div className="mb-8">
            <h2 
              className="text-2xl font-semibold mb-6"
              style={{ color: currentTheme.colors.accentSecondary }}
            >
              Your Custom Theme
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {renderThemeCard(customTheme)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThemeGallery;