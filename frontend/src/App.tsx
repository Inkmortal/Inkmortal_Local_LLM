import React from 'react';
import './App.css';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth, withAuth } from './context/AuthContext';
import AdminDashboard from './pages/admin/Admin';
import IPWhitelist from './pages/admin/IPWhitelist';
import RegistrationTokens from './pages/admin/RegistrationTokens';
import APIKeys from './pages/admin/APIKeys';
import QueueMonitor from './pages/admin/QueueMonitor';
import UserManagement from './pages/admin/UserManagement';
import SystemStats from './pages/admin/SystemStats';
import AdminLogin from './pages/admin/Login';
import UserLogin from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/auth/Unauthorized';
import Profile from './pages/user/Profile';
import ChatPage from './pages/chat/ModernChatPage';
import ModernHomePage from './components/HomePage';
import Layout from './components/layout/Layout';
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import ThemeSelector from './components/ui/ThemeSelector';
import ThemeGallery from './pages/themes/ThemeGallery';

// Wrap admin components with auth protection
const ProtectedAdminDashboard = withAuth(AdminDashboard, true);
const ProtectedIPWhitelist = withAuth(IPWhitelist, true);
const ProtectedRegistrationTokens = withAuth(RegistrationTokens, true);
const ProtectedAPIKeys = withAuth(APIKeys, true);
const ProtectedQueueMonitor = withAuth(QueueMonitor, true);
const ProtectedUserManagement = withAuth(UserManagement, true);
const ProtectedSystemStats = withAuth(SystemStats, true);

// User protected components
const ProtectedProfile = withAuth(Profile, false);
const ProtectedChatPage = withAuth(ChatPage, false);

// Simple routing mechanism (to be replaced with React Router in a real app)
type Route = 
  | 'admin' 
  | 'admin/ip-whitelist' 
  | 'admin/tokens' 
  | 'admin/api-keys'
  | 'admin/queue' 
  | 'admin/users' 
  | 'admin/stats' 
  | 'admin/login' 
  | 'login'
  | 'register'
  | 'profile'
  | 'unauthorized'
  | 'themes'
  | 'chat'
  | 'home';

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
      setTimeout(() => setIsLoading(false), 100);
      
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
      // Admin routes
      case 'admin':
        return <ProtectedAdminDashboard currentRoute={currentRoute} />;
      case 'admin/ip-whitelist':
        return <ProtectedIPWhitelist currentRoute={currentRoute} />;
      case 'admin/tokens':
        return <ProtectedRegistrationTokens currentRoute={currentRoute} />;
      case 'admin/api-keys':
        return <ProtectedAPIKeys currentRoute={currentRoute} />;
      case 'admin/queue':
        return <ProtectedQueueMonitor currentRoute={currentRoute} />;
      case 'admin/users':
        return <Layout><ProtectedUserManagement currentRoute={currentRoute} /></Layout>;
      case 'admin/stats':
        return <ProtectedSystemStats currentRoute={currentRoute} />;
      case 'admin/login':
        return <AdminLogin />;
      
      // Auth routes
      case 'login':
        return <UserLogin />;
      case 'register':
        return <Register />;
      case 'profile':
        return <ProtectedProfile />;
      case 'unauthorized':
        return <Unauthorized />;
      
      // Content routes
      case 'themes':
        return <ThemeGallery />;
      case 'chat':
        return <ProtectedChatPage />;
      case 'home':
      default:
        return <ModernHomePage />;
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