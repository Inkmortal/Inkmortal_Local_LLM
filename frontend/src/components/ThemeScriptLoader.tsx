import React, { useEffect } from 'react';

// This component will inject our theme adjustment script into the DOM
const ThemeScriptLoader: React.FC = () => {
  useEffect(() => {
    // Create script element 
    const script = document.createElement('script');
    script.src = '/src/styles/theme-adjustments.js';
    script.async = true;
    script.type = 'text/javascript';
    
    // Add script to document
    document.body.appendChild(script);
    
    // Cleanup when component unmounts
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default ThemeScriptLoader;