import React, { useState, useEffect } from 'react';
import { useTheme, Theme, ThemeName, themes } from '../../context/ThemeContext';
import Button from '../../components/ui/Button';
import ThemeCard from '../../components/themes/ThemeCard';
import ThemeCustomizer from '../../components/themes/ThemeCustomizer';
import { popularThemes, PREVIOUS_ROUTE_KEY } from '../../components/themes/ThemeData';

const ThemeGallery: React.FC = () => {
  const { currentTheme, setTheme, customThemes, addCustomTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [workingTheme, setWorkingTheme] = useState<Theme | null>(null);
  const [previousRoute, setPreviousRoute] = useState<string | null>(null);

  // Combine built-in themes with popular themes
  const allThemes = { ...themes };
  popularThemes.forEach(theme => {
    if (!allThemes[theme.name]) {
      allThemes[theme.name as ThemeName] = theme as Theme;
    }
  });

  // Store the previous route when component mounts
  useEffect(() => {
    // Try to get previous route from localStorage first
    const storedPrevRoute = localStorage.getItem(PREVIOUS_ROUTE_KEY);
    if (storedPrevRoute) {
      setPreviousRoute(storedPrevRoute);
    } else {
      // If not stored, use current referring document
      const referrer = document.referrer;
      const currentOrigin = window.location.origin;

      if (referrer && referrer.startsWith(currentOrigin)) {
        // Extract path part
        const path = referrer.substring(currentOrigin.length);
        setPreviousRoute(path || '/');
      } else {
        setPreviousRoute('/');
      }
    }

    // Clean up the storage on component unmount
    return () => {
      localStorage.removeItem(PREVIOUS_ROUTE_KEY);
    };
  }, []);

  // Function to go back to previous route
  const goBack = () => {
    if (previousRoute) {
      window.navigateTo(previousRoute);
    } else {
      window.navigateTo('/');
    }
  };

  // Theme card click handler
  const handleThemeCardClick = (theme: Theme) => {
    setTheme(theme.name);
    setSelectedTheme(theme);
    // Initialize working theme when theme is selected for customization
    setWorkingTheme({
      ...theme,
      name: 'custom',
      displayName: 'Custom Theme'
    });
  };

 // Save the custom theme
const saveTheme = () => {
  if (workingTheme) {
    let themeToSave: Theme;
    if (workingTheme.name === 'custom') {
      // Modifying existing custom theme
      themeToSave = { ...workingTheme };
      addCustomTheme(themeToSave);
      setTheme('custom');
    } else {
      // Creating a new theme
      let newThemeName = workingTheme.displayName.toLowerCase().replace(/\s+/g, '-');
      let counter = 1;
      while (allThemes[newThemeName]) {
        newThemeName = `${workingTheme.displayName.toLowerCase().replace(/\s+/g, '-')}-${counter}`;
        counter++;
      }

     themeToSave = {
       ...workingTheme,
       name: newThemeName as ThemeName,
     };

     // Add to allThemes (Need to update context for this)
     allThemes[newThemeName] = themeToSave;
     addCustomTheme(themeToSave);
     setTheme(newThemeName as ThemeName);
   }

   // After saving, go back to previous page if user wants to
   const shouldNavigateBack = window.confirm('Theme saved! Return to previous page?');
   if (shouldNavigateBack) {
     goBack();
   }
 }
};

  // Export theme as JSON
  const exportTheme = () => {
    if (!workingTheme) return;

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
          name: 'custom' as ThemeName,
          displayName: imported.displayName || 'Custom Theme'
        });
      } catch (err) {
        console.error('Error importing theme:', err);
        alert('Invalid theme file. Please try another JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen py-16 px-4" style={{ backgroundColor: currentTheme.colors.bgPrimary, color: currentTheme.colors.textPrimary }}>
      <div className="fixed top-4 right-4 z-10 flex items-center space-x-3">
        <Button 
          size="sm"
          variant="outline"
          onClick={goBack}
        >
          Back
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
          Explore different themes for your Seadragon LLM experience or create your own
        </p>
        
        <div className="mb-8">
          <h2 
            className="text-2xl font-semibold mb-6"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            Default Themes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.keys(allThemes).map(name => (
              <ThemeCard
                key={name}
                theme={allThemes[name as ThemeName]}
                currentTheme={currentTheme}
                onClick={handleThemeCardClick}
                isActive={currentTheme.name === name}
              />
            ))}
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
            {popularThemes.map(theme => (
              <ThemeCard
                key={theme.name}
                theme={theme as Theme}
                currentTheme={currentTheme}
                onClick={handleThemeCardClick}
                isActive={currentTheme.name === theme.name}
              />
            ))}
          </div>
        </div>

        {Object.keys(customThemes).length > 0 && (
          <div className="mb-8">
            <h2
              className="text-2xl font-semibold mb-6"
              style={{ color: currentTheme.colors.accentSecondary }}
            >
              Your Custom Themes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Object.entries(customThemes).map(([themeName, theme]) => (
                <ThemeCard
                  key={themeName}
                  theme={theme}
                  currentTheme={currentTheme}
                  onClick={handleThemeCardClick}
                  isActive={currentTheme.name === themeName}
                />
              ))}
            </div>
          </div>
        )}

        {workingTheme && (
          <ThemeCustomizer
            workingTheme={workingTheme}
            setWorkingTheme={setWorkingTheme}
            currentTheme={currentTheme}
            saveTheme={saveTheme}
            exportTheme={exportTheme}
            handleImport={handleImport}
          />
        )}
      </div>
    </div>
  );
};

export default ThemeGallery;