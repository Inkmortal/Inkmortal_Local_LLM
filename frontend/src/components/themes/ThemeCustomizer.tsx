import React, { useState } from 'react';
import { Theme } from '../../context/ThemeContext';
import { colorSettings, ColorSetting } from './ThemeData';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ThemePreview from './ThemePreview';

interface ThemeCustomizerProps {
  workingTheme: Theme | null;
  setWorkingTheme: (theme: Theme | null) => void;
  currentTheme: Theme;
  saveTheme: () => void;
  exportTheme: () => void;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  workingTheme,
  setWorkingTheme,
  currentTheme,
  saveTheme,
  exportTheme,
  handleImport
}) => {
  const [themeName, setThemeName] = useState<string>(workingTheme?.displayName || 'Custom Theme');

  // Handle custom theme name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThemeName(e.target.value);
    if (workingTheme) {
      setWorkingTheme({
        ...workingTheme,
        displayName: e.target.value
      });
    }
  };

    // Handle color change
  const handleColorChange = (key: keyof Theme['colors'], value: string) => {
    if (workingTheme) {
      setWorkingTheme({
        ...workingTheme,
        colors: {
          ...workingTheme.colors,
          [key]: value
        }
      });
    }
  };

  if (!workingTheme) return null;

  return (
    <div className="mt-12 mb-20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Customize Theme</h2>
        <Button variant="outline" onClick={() => setWorkingTheme(null)}>
          Close Customizer
        </Button>
      </div>
      <p className="mb-6 text-sm" style={{ color: currentTheme.colors.textSecondary }}>
        Create your own version of the selected theme by adjusting the colors below.
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color Settings Panel */}
        <div className="lg:col-span-2">
          <Card>
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
                value={themeName}
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
          <ThemePreview theme={workingTheme} />
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizer;