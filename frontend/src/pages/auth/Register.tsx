import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ThemeSelector from '../../components/ui/ThemeSelector';
import RegisterForm from '../../components/auth/RegisterForm';
import ROUTES from '../../routes.constants';

const Register: React.FC = () => {
  const { currentTheme } = useTheme();
  const { isAuthenticated, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuth().then(() => {
      setLoading(false);
    }).catch(error => {
      console.error('Auth check error:', error);
      setConnectionError('Failed to connect to the server. Please try again later.');
      setLoading(false);
    });
  }, [checkAuth]);

  // If user is authenticated, redirect to home
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(ROUTES.HOME);
    }
  }, [loading, isAuthenticated, navigate]);

  // Handle successful registration
  const handleRegisterSuccess = () => {
    navigate(ROUTES.CHAT);
  };

  // Handle login click
  const handleLoginClick = () => {
    navigate(ROUTES.LOGIN);
  };

  // Handle home navigation
  const handleHomeClick = () => {
    navigate(ROUTES.HOME);
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: currentTheme.colors.bgPrimary }}
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: `${currentTheme.colors.accentPrimary}40`, borderTopColor: 'transparent' }}
          ></div>
          <p style={{ color: currentTheme.colors.textPrimary }}>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        backgroundColor: currentTheme.colors.bgPrimary,
        color: currentTheme.colors.textPrimary,
        backgroundImage: `radial-gradient(circle at 10% 10%, ${currentTheme.colors.bgSecondary}20, transparent 800px)`,
      }}
    >
      {/* Navigation Bar at Top */}
      <div className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 z-10" 
        style={{ 
          backgroundColor: `${currentTheme.colors.bgSecondary}CC`,
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${currentTheme.colors.borderColor}40`,
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.08)`
        }}>
        <div className="flex items-center cursor-pointer" onClick={handleHomeClick}>
          <svg 
            className="w-8 h-8 mr-3" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: currentTheme.colors.accentPrimary }}
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 11l3 3m0 0l-3 3m3-3H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: currentTheme.colors.accentPrimary }}>
              InkMortal
            </h1>
            <div className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
              Local LLM Server
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost"
            size="sm"
            onClick={handleHomeClick}
            className="hover-float transition-all duration-300"
          >
            Home
          </Button>
          <ThemeSelector />
        </div>
      </div>

      <Card className="w-full max-w-md mt-16" hoverEffect>
        {connectionError ? (
          <div className="text-center p-6">
            <div 
              className="p-3 rounded-md mb-4"
              style={{
                backgroundColor: `${currentTheme.colors.error}20`,
                color: currentTheme.colors.error,
              }}
            >
              {connectionError}
            </div>
            <p className="mb-4" style={{ color: currentTheme.colors.textSecondary }}>
              Unable to connect to the authentication server. Please make sure the backend server is running.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-md"
              style={{
                backgroundColor: currentTheme.colors.accentPrimary,
                color: 'white',
              }}
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <RegisterForm 
            onSuccess={handleRegisterSuccess} 
            onLoginClick={handleLoginClick}
          />
        )}
      </Card>

      <div className="mt-8 text-center text-sm" style={{ color: currentTheme.colors.textMuted }}>
        <p>InkMortal LLM Server</p>
        <p className="mt-1">© {new Date().getFullYear()} Personal Project</p>
      </div>
    </div>
  );
};

export default Register;