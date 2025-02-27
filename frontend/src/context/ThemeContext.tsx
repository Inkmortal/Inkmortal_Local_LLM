import React, { createContext, useState, useEffect, useContext } from 'react';

// Import theme CSS files
import '../themes/catppuccin.css';
import '../themes/dracula.css';
import '../themes/matcha-cafe.css';
import '../themes/nord.css';
import '../themes/tokyo-night.css';
import '../themes/solarized-dark.css';
import '../themes/solarized-light.css';
import '../themes/github-dark.css';
import '../themes/github-light.css';
import '../themes/gruvbox.css';

// Define the available theme types
export type ThemeName = 'catppuccin' | 'dracula' | 'matcha-cafe' | 'nord' | 'solarized-light' | 'solarized-dark' | 'github-light' | 'github-dark' | 'tokyo-night' | 'gruvbox' | 'cyber-neon' | 'retro-wave' | 'forest' | 'custom' | string;

// Define the theme color structure
export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  borderColor: string;
  success: string;
  warning: string;
  error: string;
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: ThemeColors;
  isDark: boolean;
}

// Define preset themes
export const themes: Record<string, Theme> = {
  'catppuccin': {
    name: 'catppuccin',
    displayName: 'Catppuccin Macchiato',
    colors: {
      bgPrimary: '#24273a',
      bgSecondary: '#1e2030',
      bgTertiary: '#363a4f',
      textPrimary: '#cad3f5',
      textSecondary: '#b8c0e0',
      textMuted: '#8087a2',
      accentPrimary: '#8aadf4',
      accentSecondary: '#c6a0f6',
      accentTertiary: '#f5a97f',
      borderColor: '#494d64',
      success: '#a6da95',
      warning: '#eed49f',
      error: '#ed8796'
    },
    isDark: true
  },
  'dracula': {
    name: 'dracula',
    displayName: 'Dracula',
    colors: {
      bgPrimary: '#282a36',
      bgSecondary: '#1e1f29',
      bgTertiary: '#44475a',
      textPrimary: '#f8f8f2',
      textSecondary: '#f8f8f2cc',
      textMuted: '#f8f8f280',
      accentPrimary: '#bd93f9',
      accentSecondary: '#ff79c6',
      accentTertiary: '#ffb86c',
      borderColor: '#44475a',
      success: '#50fa7b',
      warning: '#f1fa8c',
      error: '#ff5555'
    },
    isDark: true
  },
  'matcha-cafe': {
    name: 'matcha-cafe',
    displayName: 'Japanese Matcha Cafe',
    colors: {
      bgPrimary: '#f1f0e9',
      bgSecondary: '#e3e1d9',
      bgTertiary: '#d5d3c8',
      textPrimary: '#5c5c50',
      textSecondary: '#72725e',
      textMuted: '#8a8a71',
      accentPrimary: '#88b06a',
      accentSecondary: '#c1d5b3',
      accentTertiary: '#96704c',
      borderColor: '#c5c3b8',
      success: '#7bac5c',
      warning: '#e0b568',
      error: '#d16c6c'
    },
    isDark: false
  },
  'nord': {
    name: 'nord',
    displayName: 'Nord',
    colors: {
      bgPrimary: '#2e3440',
      bgSecondary: '#3b4252',
      bgTertiary: '#434c5e',
      textPrimary: '#eceff4',
      textSecondary: '#e5e9f0',
      textMuted: '#d8dee9',
      accentPrimary: '#88c0d0',
      accentSecondary: '#81a1c1',
      accentTertiary: '#5e81ac',
      borderColor: '#4c566a',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a'
    },
    isDark: true
  },
  'tokyo-night': {
    name: 'tokyo-night',
    displayName: 'Tokyo Night',
    colors: {
      bgPrimary: '#1a1b26',
      bgSecondary: '#16161e',
      bgTertiary: '#24283b',
      textPrimary: '#a9b1d6',
      textSecondary: '#787c99',
      textMuted: '#565a7e',
      accentPrimary: '#7aa2f7',
      accentSecondary: '#bb9af7',
      accentTertiary: '#ff9e64',
      borderColor: '#292e42',
      success: '#9ece6a',
      warning: '#e0af68',
      error: '#f7768e'
    },
    isDark: true
  }
};

// Define the context type
interface ThemeContextType {
  currentTheme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
  customThemes: Record<string, Theme>;
  addCustomTheme: (theme: Theme) => void;
}

// Create the context
const ThemeContext = createContext<ThemeContextType>({
  currentTheme: themes.catppuccin,
  themeName: 'catppuccin',
  setTheme: () => {},
  customThemes: {},
  addCustomTheme: () => {}
});

// Create the provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>('catppuccin');
  const [customThemes, setCustomThemes] = useState<Record<string, Theme>>({});

  // Determine the current theme
  const currentTheme = customThemes[themeName] || themes[themeName] || themes.catppuccin;

  // Load theme from localStorage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedCustomThemes = localStorage.getItem('customThemes');

    if (savedTheme) {
      setThemeName(savedTheme as ThemeName);
    }

    if (savedCustomThemes) {
      try {
        const parsedThemes = JSON.parse(savedCustomThemes) as Record<string, Theme>;
        setCustomThemes(parsedThemes);
      } catch (e) {
        console.error('Failed to parse custom themes', e);
      }
    }
  }, []);

  // Apply the theme to the document
  useEffect(() => {
    // Get the theme to apply
    const themeToApply = currentTheme;

    // Apply data-theme attribute
    document.documentElement.setAttribute('data-theme', themeToApply.name);

    // Apply CSS variables
    document.documentElement.style.setProperty('--bg-primary', themeToApply.colors.bgPrimary);
    document.documentElement.style.setProperty('--bg-secondary', themeToApply.colors.bgSecondary);
    document.documentElement.style.setProperty('--bg-tertiary', themeToApply.colors.bgTertiary);
    document.documentElement.style.setProperty('--text-primary', themeToApply.colors.textPrimary);
    document.documentElement.style.setProperty('--text-secondary', themeToApply.colors.textSecondary);
    document.documentElement.style.setProperty('--text-muted', themeToApply.colors.textMuted);
    document.documentElement.style.setProperty('--accent-primary', themeToApply.colors.accentPrimary);
    document.documentElement.style.setProperty('--accent-secondary', themeToApply.colors.accentSecondary);
    document.documentElement.style.setProperty('--accent-tertiary', themeToApply.colors.accentTertiary);
    document.documentElement.style.setProperty('--border-color', themeToApply.colors.borderColor);
    document.documentElement.style.setProperty('--success', themeToApply.colors.success);
    document.documentElement.style.setProperty('--warning', themeToApply.colors.warning);
    document.documentElement.style.setProperty('--error', themeToApply.colors.error);

    // Save theme preference to localStorage
    localStorage.setItem('theme', themeName);

    // Save custom themes
    localStorage.setItem('customThemes', JSON.stringify(customThemes));

  }, [themeName, customThemes, currentTheme]);

  // Set theme function
  const setTheme = (newThemeName: ThemeName) => {
    setThemeName(newThemeName);
  };

  const addCustomTheme = (theme: Theme) => {
    setCustomThemes(prevThemes => ({
      ...prevThemes,
      [theme.name]: theme,
    }));
  }

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        themeName,
        setTheme,
        customThemes,
        addCustomTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);