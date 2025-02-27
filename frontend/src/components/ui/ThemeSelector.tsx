import React, { useState, useRef, useEffect } from 'react';
import { useTheme, themes, ThemeName } from '../../context/ThemeContext';

interface ThemeSelectorProps {
  compact?: boolean;
}

// Key for storing recent themes in localStorage
const RECENT_THEMES_KEY = 'seadragon-recent-themes';
const MAX_RECENT_THEMES = 3;

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ compact = false }) => {
  const { currentTheme, themeName, setTheme, isCustomThemeActive, customTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [recentThemes, setRecentThemes] = useState<ThemeName[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent themes from localStorage on mount
  useEffect(() => {
    try {
      const savedRecent = localStorage.getItem(RECENT_THEMES_KEY);
      if (savedRecent) {
        const parsed = JSON.parse(savedRecent) as ThemeName[];
        setRecentThemes(parsed);
      } else {
        // Initialize with default themes if no recent themes found
        setRecentThemes(['catppuccin', 'dracula', 'matcha-cafe']);
      }
    } catch (e) {
      console.error('Error loading recent themes:', e);
      setRecentThemes(['catppuccin', 'dracula', 'matcha-cafe']);
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getThemeDisplayName = (name: ThemeName) => {
    if (name === 'custom' && isCustomThemeActive) {
      return 'Custom Theme';
    }
    return themes[name]?.displayName || name.replace(/-/g, ' ');
  };

  // Update recent themes when a theme is selected
  const updateRecentThemes = (selectedTheme: ThemeName) => {
    const updatedRecent = [
      selectedTheme,
      ...recentThemes.filter(name => name !== selectedTheme)
    ].slice(0, MAX_RECENT_THEMES);
    
    setRecentThemes(updatedRecent);
    
    try {
      localStorage.setItem(RECENT_THEMES_KEY, JSON.stringify(updatedRecent));
    } catch (e) {
      console.error('Error saving recent themes:', e);
    }
  };

  const handleThemeChange = (newTheme: ThemeName) => {
    setTheme(newTheme);
    updateRecentThemes(newTheme);
    setIsOpen(false);
  };

  const navigateToThemeGallery = (e: React.MouseEvent) => {
    e.preventDefault();
    window.navigateTo('/themes');
    setIsOpen(false);
  };

  const renderThemeButton = (name: ThemeName) => {
    // Handle both built-in themes and custom theme
    const theme = name === 'custom' && isCustomThemeActive 
      ? customTheme 
      : themes[name];
      
    // Skip if theme doesn't exist (shouldn't happen, but just in case)
    if (!theme) return null;
    
    const isActive = themeName === name || (name === 'custom' && isCustomThemeActive);
    
    return (
      <button
        key={name}
        onClick={() => handleThemeChange(name)}
        className={`flex items-center w-full text-left px-3 py-2 rounded-md ${isActive ? 'bg-opacity-20' : 'bg-opacity-0'} hover:bg-opacity-10 transition-colors`}
        style={{
          backgroundColor: isActive ? theme.colors.accentPrimary : 'transparent',
          color: currentTheme.colors.textPrimary
        }}
      >
        <span 
          className="w-4 h-4 rounded-full mr-2 border"
          style={{ 
            backgroundColor: theme.colors.bgPrimary,
            borderColor: theme.colors.borderColor,
            boxShadow: `inset 0 0 0 2px ${theme.colors.accentPrimary}`
          }}
        />
        <span className="font-medium">{theme.displayName}</span>
      </button>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center rounded-md transition-colors ${compact ? 'p-2' : 'px-3 py-2'}`}
        style={{
          backgroundColor: `${currentTheme.colors.bgTertiary}40`,
          color: currentTheme.colors.textPrimary,
          border: `1px solid ${currentTheme.colors.borderColor}`
        }}
      >
        <span 
          className={`w-4 h-4 rounded-full ${compact ? '' : 'mr-2'}`}
          style={{ 
            backgroundColor: currentTheme.colors.accentPrimary,
          }}
        />
        {!compact && (
          <>
            <span className="mr-1">Theme:</span>
            <span className="font-medium">{getThemeDisplayName(themeName)}</span>
            <svg 
              className="w-4 h-4 ml-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 z-50 mt-2 w-56 rounded-md shadow-lg overflow-hidden"
          style={{
            backgroundColor: currentTheme.colors.bgSecondary,
            border: `1px solid ${currentTheme.colors.borderColor}`
          }}
        >
          <div className="py-2">
            <div className="px-3 py-2 mb-1 border-b" style={{ borderColor: currentTheme.colors.borderColor }}>
              <h3 className="font-medium" style={{ color: currentTheme.colors.textPrimary }}>Recent Themes</h3>
            </div>
            
            {/* Show only recent themes */}
            <div className="space-y-1 px-2 mb-2">
              {recentThemes.map(name => renderThemeButton(name))}
            </div>

            <div className="px-3 py-2 mt-1 border-t" style={{ borderColor: currentTheme.colors.borderColor }}>
              <a
                href="/themes"
                className="block text-center py-2 rounded-md"
                style={{
                  backgroundColor: currentTheme.colors.accentSecondary,
                  color: currentTheme.isDark ? 'white' : 'black'
                }}
                onClick={navigateToThemeGallery}
              >
                Explore All Themes
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;