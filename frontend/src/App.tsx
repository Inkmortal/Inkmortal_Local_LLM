import React, { useEffect } from 'react';
import './App.css';
import { useRoutes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import NotificationProvider from './components/ui/Notification';
import { appRoutes } from './routes';
import { StreamingProvider } from './services/chat/StreamingContext';
import { ChatProvider } from './services/chat/ChatStore';

// Clean up global window navigateTo function to avoid issues
declare global {
  interface Window {
    navigateTo?: (path: string) => boolean;
  }
}

function App() {
  // Use the routes configuration from the routes file
  const routeElement = useRoutes(appRoutes);

  // Clean up any legacy navigateTo when app mounts
  useEffect(() => {
    if (window.navigateTo) {
      console.warn('Removing legacy navigation function. Use React Router instead.');
      delete window.navigateTo;
    }
  }, []);

  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <StreamingProvider>
            <ChatProvider>
              {routeElement}
            </ChatProvider>
          </StreamingProvider>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;