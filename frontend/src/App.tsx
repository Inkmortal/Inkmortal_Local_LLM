import React from 'react';
import './App.css';
import { useRoutes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { appRoutes } from './routes';

function App() {
  // Use the routes configuration from the routes file
  const routeElement = useRoutes(appRoutes);

  return (
    <ThemeProvider>
      <AuthProvider>
        {routeElement}
      </AuthProvider>
    </ThemeProvider>
  );
}

// Clean up global window navigateTo function to avoid issues
declare global {
  interface Window {
    navigateTo?: (path: string) => boolean;
  }
}

// Clean up any legacy navigateTo when app mounts
React.useEffect(() => {
  if (window.navigateTo) {
    console.warn('Removing legacy navigation function. Use React Router instead.');
    delete window.navigateTo;
  }
}, []);

export default App;