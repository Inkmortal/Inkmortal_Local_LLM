import React, { useState } from 'react';
import { useTheme, Theme, ThemeName } from '../../context/ThemeContext';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface ColorSetting {
  name: string;
  key: keyof Theme['colors'];
  description: string;
}

const ThemeCustomizer: React.FC = () => {
  const { currentTheme, customTheme, setCustomTheme, setTheme } = useTheme();
  
  // Initialize working theme from custom theme or current theme
  const [workingTheme, setWorkingTheme] = useState<Theme>(
    customTheme || { ...currentTheme, name: 'custom', displayName: 'Custom Theme' }
  );
  
  // Define color settings to display in the UI
  const colorSettings: ColorSetting[] = [
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

  // Handle custom theme name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkingTheme({
      ...workingTheme,
      displayName: e.target.value
    });
  };

  // Handle color change
  const handleColorChange = (key: keyof Theme['colors'], value: string) => {
    setWorkingTheme({
      ...workingTheme,
      colors: {
        ...workingTheme.colors,
        [key]: value
      }
    });
  };

  // Save the custom theme
  const saveTheme = () => {
    const themeToSave: Theme = {
      ...workingTheme,
      name: 'custom' as ThemeName
    };
    
    setCustomTheme(themeToSave);
    setTheme('custom');
  };

  // Export theme as JSON
  const exportTheme = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      JSON.stringify(workingTheme, null, 2)
    );
    
    const downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', dataStr);
    downloadLink.setAttribute('download', `${workingTheme.displayName.replace(/\s+/g, '-').toLowerCase()}.json`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Import theme from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as Theme;
        setWorkingTheme({
          ...imported,
          name: 'custom' as ThemeName
        });
      } catch (err) {
        console.error('Error importing theme:', err);
        // In a real app, we would show an error message to the user
      }
    };
    reader.readAsText(file);
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" style={{ color: currentTheme.colors.accentPrimary }}>
          Theme Customizer
        </h1>
        <div className="mt-2 sm:mt-0">
          <p className="text-sm" style={{ color: currentTheme.colors.textMuted }}>
            Create and customize your own theme
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color Settings Panel */}
        <div className="lg:col-span-2">
          <Card title="Theme Settings">
            <div className="mb-4">
              <label 
                htmlFor="theme-name" 
                className="block mb-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Theme Name
              </label>
              <input
                id="theme-name"
                type="text"
                value={workingTheme.displayName}
                onChange={handleNameChange}
                className="w-full p-2 rounded-md border mb-4"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor
                }}
              />
            </div>

            <h3 
              className="text-lg font-medium mb-3" 
              style={{ color: currentTheme.colors.textSecondary }}
            >
              Colors
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {colorSettings.map((setting) => (
                <div key={setting.key} className="mb-2">
                  <label 
                    htmlFor={`color-${setting.key}`} 
                    className="block mb-1"
                    style={{ color: currentTheme.colors.textSecondary }}
                  >
                    {setting.name}
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      id={`color-${setting.key}`}
                      value={workingTheme.colors[setting.key]}
                      onChange={(e) => handleColorChange(setting.key, e.target.value)}
                      className="w-12 h-10 rounded-l-md border-y border-l p-1"
                      style={{
                        borderColor: currentTheme.colors.borderColor
                      }}
                    />
                    <input
                      type="text"
                      value={workingTheme.colors[setting.key]}
                      onChange={(e) => handleColorChange(setting.key, e.target.value)}
                      className="flex-1 p-2 rounded-r-md border"
                      style={{
                        backgroundColor: currentTheme.colors.bgTertiary,
                        color: currentTheme.colors.textPrimary,
                        borderColor: currentTheme.colors.borderColor
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
                    {setting.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <Button onClick={saveTheme}>
                Save & Apply Theme
              </Button>
              <Button variant="outline" onClick={exportTheme}>
                Export Theme
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  id="import-theme"
                  onChange={handleImport}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline">
                  Import Theme
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <Card title="Preview">
            <div 
              className="p-4 rounded-lg"
              style={{
                backgroundColor: workingTheme.colors.bgPrimary,
                color: workingTheme.colors.textPrimary,
                border: `1px solid ${workingTheme.colors.borderColor}`
              }}
            >
              <h3 
                className="text-lg font-medium mb-3"
                style={{ color: workingTheme.colors.accentPrimary }}
              >
                Theme Preview
              </h3>
              
              <p style={{ color: workingTheme.colors.textPrimary }}>
                This is how your text will appear with the primary text color.
              </p>
              
              <p className="mt-2" style={{ color: workingTheme.colors.textSecondary }}>
                Secondary text looks like this.
              </p>
              
              <p className="mt-2" style={{ color: workingTheme.colors.textMuted }}>
                And this is how muted text will appear.
              </p>
              
              <div 
                className="mt-4 p-3 rounded-md"
                style={{ backgroundColor: workingTheme.colors.bgSecondary }}
              >
                <p>This is a secondary background element.</p>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="px-3 py-1.5 rounded-md"
                  style={{ 
                    backgroundColor: workingTheme.colors.accentPrimary,
                    color: workingTheme.isDark ? 'white' : 'black'
                  }}
                >
                  Primary Button
                </button>
                
                <button
                  className="px-3 py-1.5 rounded-md"
                  style={{ 
                    backgroundColor: workingTheme.colors.accentSecondary,
                    color: workingTheme.isDark ? 'white' : 'black'
                  }}
                >
                  Secondary
                </button>
                
                <button
                  className="px-3 py-1.5 rounded-md"
                  style={{ 
                    backgroundColor: workingTheme.colors.accentTertiary,
                    color: workingTheme.isDark ? 'white' : 'black'
                  }}
                >
                  Tertiary
                </button>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                <div
                  className="px-2 py-1 rounded-full text-xs"
                  style={{ 
                    backgroundColor: `${workingTheme.colors.success}30`,
                    color: workingTheme.colors.success
                  }}
                >
                  Success
                </div>
                
                <div
                  className="px-2 py-1 rounded-full text-xs"
                  style={{ 
                    backgroundColor: `${workingTheme.colors.warning}30`,
                    color: workingTheme.colors.warning
                  }}
                >
                  Warning
                </div>
                
                <div
                  className="px-2 py-1 rounded-full text-xs"
                  style={{ 
                    backgroundColor: `${workingTheme.colors.error}30`,
                    color: workingTheme.colors.error
                  }}
                >
                  Error
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <span style={{ color: workingTheme.colors.textSecondary }}>Sample progress</span>
                  <span style={{ color: workingTheme.colors.textMuted }}>75%</span>
                </div>
                <div 
                  className="mt-1 h-2 w-full rounded-full overflow-hidden"
                  style={{ backgroundColor: `${workingTheme.colors.bgTertiary}60` }}
                >
                  <div 
                    className="h-full rounded-full" 
                    style={{ 
                      width: '75%',
                      backgroundColor: workingTheme.colors.accentPrimary
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ThemeCustomizer;