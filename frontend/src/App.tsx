import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import AdminDashboard from './pages/admin/Admin';
import IPWhitelist from './pages/admin/IPWhitelist';
import RegistrationTokens from './pages/admin/RegistrationTokens';
import APIKeys from './pages/admin/APIKeys';
import QueueMonitor from './pages/admin/QueueMonitor';
import ThemeCustomizer from './pages/admin/ThemeCustomizer';

// Simple routing mechanism (to be replaced with React Router in a real app)
type Route = 'admin' | 'admin/ip-whitelist' | 'admin/tokens' | 'admin/api-keys' | 'admin/queue' | 'admin/themes' | 'home';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('home');

  // Set up navigation handling
  useEffect(() => {
    // Define the global navigation handler
    window.navigateTo = (path: string) => {
      console.log('Navigating to:', path);
      
      // Remove leading slash if present
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      
      // Set the route
      setCurrentRoute(cleanPath as Route);
      
      // Update window URL without full navigation (for visual feedback)
      window.history.pushState(null, '', path);
      
      return false; // Prevent default navigation
    };
    
    // Listen for popstate to handle browser back/forward
    const handlePopState = () => {
      const path = window.location.pathname.slice(1); // Remove leading slash
      setCurrentRoute((path || 'home') as Route);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Check initial URL on load
    const initialPath = window.location.pathname.slice(1);
    if (initialPath) {
      setCurrentRoute(initialPath as Route);
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Render the current route
  const renderRoute = () => {
    switch (currentRoute) {
      case 'admin':
        return <AdminDashboard />;
      case 'admin/ip-whitelist':
        return <IPWhitelist />;
      case 'admin/tokens':
        return <RegistrationTokens />;
      case 'admin/api-keys':
        return <APIKeys />;
      case 'admin/queue':
        return <QueueMonitor />;
      case 'admin/themes':
        return <ThemeCustomizer />;
      case 'home':
      default:
        return (
          <div className="app-container bg-themed">
            <div className="theme-switcher">
              {/* Theme buttons will be replaced by our new ThemeSelector component */}
            </div>
            <h1 className="app-title">Seadragon LLM</h1>
            <p className="app-subtitle">
              Your personal AI tutor powered by Llama 3
            </p>
            <div className="app-card">
              <p>
                This system is currently in development. Come back soon to experience
                assistance with math problems, coding questions, and textbook content.
              </p>
              <button 
                className="mt-4 bg-themed-tertiary hover:opacity-90 px-4 py-2 rounded text-themed"
                onClick={() => window.navigateTo('/admin')}
              >
                Go to Admin Panel
              </button>
            </div>
          </div>
        );
    }
  };
  
  return (
    <ThemeProvider>
      {renderRoute()}
    </ThemeProvider>
  );
}

// Extend Window interface to include our navigation function
declare global {
  interface Window {
    navigateTo: (path: string) => boolean;
  }
}

export default App;