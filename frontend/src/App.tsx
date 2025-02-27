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
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import ThemeSelector from './components/ui/ThemeSelector';
import ThemeGallery from './pages/themes/ThemeGallery';

// Wrap admin components with auth protection
const ProtectedAdminDashboard = withAuth(AdminDashboard);
const ProtectedIPWhitelist = withAuth(IPWhitelist);
const ProtectedRegistrationTokens = withAuth(RegistrationTokens);
const ProtectedAPIKeys = withAuth(APIKeys);
const ProtectedQueueMonitor = withAuth(QueueMonitor);
const ProtectedThemeCustomizer = withAuth(ThemeCustomizer);
const ProtectedSystemStats = withAuth(SystemStats);

// Simple routing mechanism (to be replaced with React Router in a real app)
type Route = 
  | 'admin' 
  | 'admin/ip-whitelist' 
  | 'admin/tokens' 
  | 'admin/api-keys'
  | 'admin/queue' 
  | 'admin/theme' 
  | 'admin/stats' 
  | 'admin/login' 
  | 'themes'
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

// Home Page component
const HomePage: React.FC = () => {
  const { currentTheme } = useTheme();
  
  // Feature cards data
  const features = [
    {
      title: "Math Problem Solving",
      description: "Get step-by-step solutions for math problems with clear explanations and LaTeX rendering.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Coding Assistance",
      description: "Learn programming concepts with interactive examples and syntax highlighting for multiple languages.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      )
    },
    {
      title: "Textbook Helpers",
      description: "Upload textbook images and get explanations, summaries, and in-depth understanding of the content.",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    }
  ];
  
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: currentTheme.colors.bgPrimary, color: currentTheme.colors.textPrimary }}>
      <div className="fixed top-4 right-4 z-10 flex items-center space-x-3">
        <Button 
          size="sm"
          variant="outline"
          onClick={() => window.navigateTo('/admin/login')}
        >
          Admin
        </Button>
        <ThemeSelector />
      </div>
      
      <header className="py-16 px-4 text-center">
        <h1 
          className="text-5xl font-bold mb-4"
          style={{ color: currentTheme.colors.accentPrimary }}
        >
          Seadragon LLM
        </h1>
        <p 
          className="text-xl max-w-2xl mx-auto"
          style={{ color: currentTheme.colors.textSecondary }}
        >
          Your personal AI tutor powered by Llama 3.3 70B, designed to assist with educational content
        </p>
      </header>
      
      <main className="flex-grow container mx-auto px-4 pb-16">
        <section className="mb-20">
          <h2 
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            Educational Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="flex flex-col h-full">
                <div 
                  className="p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${currentTheme.colors.accentPrimary}20`, color: currentTheme.colors.accentPrimary }}
                >
                  {feature.icon}
                </div>
                <h3 
                  className="text-xl font-medium mb-2" 
                  style={{ color: currentTheme.colors.accentPrimary }}
                >
                  {feature.title}
                </h3>
                <p className="mb-4" style={{ color: currentTheme.colors.textSecondary }}>
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </section>
        
        <section className="mb-20">
          <h2 
            className="text-2xl font-semibold mb-8 text-center"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            About This Project
          </h2>
          <Card className="max-w-3xl mx-auto">
            <p className="mb-4" style={{ color: currentTheme.colors.textSecondary }}>
              This is a personal hobby project designed to run the Llama 3.3 70B model on a Mac Mini M4 Pro,
              providing educational assistance through a beautiful and functional interface.
            </p>
            <p className="mb-4" style={{ color: currentTheme.colors.textSecondary }}>
              The system features a priority-based queue to manage requests efficiently, allowing you to 
              integrate with coding tools, custom applications, and this web interface.
            </p>
            <p style={{ color: currentTheme.colors.textSecondary }}>
              Currently in development, this project aims to create a "tutor-like" experience for 
              solving math problems, answering textbook questions, and providing coding assistance.
            </p>
          </Card>
        </section>
      </main>
      
      <footer 
        className="py-6 text-center"
        style={{ color: currentTheme.colors.textMuted }}
      >
        <p className="text-sm">
          Seadragon LLM | Personal Educational AI Project | © {new Date().getFullYear()}
        </p>
      </footer>
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
      case 'admin/theme':
        return <ProtectedThemeCustomizer />;
      case 'admin/stats':
        return <ProtectedSystemStats />;
      case 'admin/login':
        return <AdminLogin />;
      case 'themes':
        return <ThemeGallery />;
      case 'home':
      default:
        return <HomePage />;
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