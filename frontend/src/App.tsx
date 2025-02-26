import React from 'react';
import './App.css';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth, withAuth } from './context/AuthContext';
import AdminDashboard from './pages/admin/Admin';
import IPWhitelist from './pages/admin/IPWhitelist';
import RegistrationTokens from './pages/admin/RegistrationTokens';
import APIKeys from './pages/admin/APIKeys';
import QueueMonitor from './pages/admin/QueueMonitor';
import ThemeCustomizer from './pages/admin/ThemeCustomizer';
import SystemStats from './pages/admin/SystemStats';
import AdminLogin from './pages/admin/Login';

// Wrap admin components with auth protection
const ProtectedAdminDashboard = withAuth(AdminDashboard);
const ProtectedIPWhitelist = withAuth(IPWhitelist);
const ProtectedRegistrationTokens = withAuth(RegistrationTokens);
const ProtectedAPIKeys = withAuth(APIKeys);
const ProtectedQueueMonitor = withAuth(QueueMonitor);
const ProtectedThemeCustomizer = withAuth(ThemeCustomizer);
const ProtectedSystemStats = withAuth(SystemStats);

// Simple routing mechanism (to be replaced with React Router in a real app)
type Route = 'admin' | 'admin/ip-whitelist' | 'admin/tokens' | 'admin/api-keys' 
          | 'admin/queue' | 'admin/themes' | 'admin/stats' | 'admin/login' | 'home';

// Loader component
const Loader: React.FC = () => {
  const { currentTheme } = useTheme();
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: currentTheme.colors.bgPrimary }}
    >
      <div 
        className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: `transparent transparent ${currentTheme.colors.accentPrimary} ${currentTheme.colors.accentPrimary}` }}
      />
    </div>
  );
};

function App() {
  const [currentRoute, setCurrentRoute] = React.useState<Route>('home');
  const [isLoading, setIsLoading] = React.useState(false);
  
  // Set up navigation handling
  React.useEffect(() => {
    // Define the global navigation handler
    window.navigateTo = (path: string) => {
      console.log('Navigating to:', path);
      setIsLoading(true);
      
      // Remove leading slash if present
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      
      // Set the route
      setCurrentRoute(cleanPath as Route);
      
      // Update window URL without full navigation (for visual feedback)
      window.history.pushState(null, '', path);
      
      // Simulate loading (remove in production with real navigation)
      setTimeout(() => setIsLoading(false), 300);
      
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
    if (isLoading) {
      return <Loader />;
    }
    
    switch (currentRoute) {
      case 'admin':
        return <ProtectedAdminDashboard />;
      case 'admin/ip-whitelist':
        return <ProtectedIPWhitelist />;
      case 'admin/tokens':
        return <ProtectedRegistrationTokens />;
      case 'admin/api-keys':
        return <ProtectedAPIKeys />;
      case 'admin/queue':
        return <ProtectedQueueMonitor />;
      case 'admin/themes':
        return <ProtectedThemeCustomizer />;
      case 'admin/stats':
        return <ProtectedSystemStats />;
      case 'admin/login':
        return <AdminLogin />;
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
                onClick={() => window.navigateTo('/admin/login')}
              >
                Admin Login
              </button>
            </div>
          </div>
        );
    }
  };
  
  return (
    <ThemeProvider>
      <AuthProvider>
        {renderRoute()}
      </AuthProvider>
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