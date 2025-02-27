import { Theme, ThemeName } from '../../context/ThemeContext';

// Define the available color settings for customization
export interface ColorSetting {
  name: string;
  key: keyof Theme['colors'];
  description: string;
}

export const colorSettings: ColorSetting[] = [
  { name: 'Background Primary', key: 'bgPrimary', description: 'Main background color' },
  { name: 'Background Secondary', key: 'bgSecondary', description: 'Secondary background for cards, panels' },
  { name: 'Background Tertiary', key: 'bgTertiary', description: 'Tertiary background for hover states' },
  { name: 'Text Primary', key: 'textPrimary', description: 'Main text color' },
  { name: 'Text Secondary', key: 'textSecondary', description: 'Secondary text color for labels' },
  { name: 'Text Muted', key: 'textMuted', description: 'Muted text color for secondary information' },
  { name: 'Accent Primary', key: 'accentPrimary', description: 'Primary accent color' },
  { name: 'Accent Secondary', key: 'accentSecondary', description: 'Secondary accent color' },
  { name: 'Accent Tertiary', key: 'accentTertiary', description: 'Tertiary accent color' },
  { name: 'Border Color', key: 'borderColor', description: 'Color for borders and dividers' },
  { name: 'Success', key: 'success', description: 'Color for success states' },
  { name: 'Warning', key: 'warning', description: 'Color for warning states' },
  { name: 'Error', key: 'error', description: 'Color for error states' }
];

// Define common popular themes that users might want to try
export const popularThemes = [
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

// Key for tracking previous route
export const PREVIOUS_ROUTE_KEY = 'theme-gallery-previous-route';