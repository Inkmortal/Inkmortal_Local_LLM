import React, { useState } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import AdminDashboard from './pages/admin/Admin';
import IPWhitelist from './pages/admin/IPWhitelist';
import RegistrationTokens from './pages/admin/RegistrationTokens';
import APIKeys from './pages/admin/APIKeys';
import QueueMonitor from './pages/admin/QueueMonitor';

// Simple routing mechanism (to be replaced with React Router in a real app)
type Route = 'admin' | 'admin/ip-whitelist' | 'admin/tokens' | 'admin/api-keys' | 'admin/queue' | 'home';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('admin');

  // Mock routing function (would use React Router in a real app)
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
                className="mt-4 bg-themed-tertiary hover:opacity-90 px-4 py-2 rounded"
                onClick={() => setCurrentRoute('admin')}
              >
                Go to Admin Panel
              </button>
            </div>
          </div>
        );
    }
  };

  // Navigation events are captured and intercepted by Layout components
  // This allows us to navigate without a full router implementation
  window.onNavigate = (path: string) => {
    setCurrentRoute(path.replace('/', '') as Route);
    return false; // Prevent default navigation
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
    onNavigate: (path: string) => boolean;
  }
}

export default App;