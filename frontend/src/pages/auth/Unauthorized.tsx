import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/ui/Button';
import ThemeSelector from '../../components/ui/ThemeSelector';
import ROUTES from '../../routes.constants';

const Unauthorized: React.FC = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  // Handle home navigation
  const handleHomeClick = () => {
    navigate(ROUTES.HOME);
  };

  // Handle login navigation
  const handleLoginClick = () => {
    navigate(ROUTES.LOGIN);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: currentTheme.colors.bgPrimary,
        color: currentTheme.colors.textPrimary,
        backgroundImage: `radial-gradient(circle at 10% 10%, ${currentTheme.colors.bgSecondary}20, transparent 800px)`,
      }}
    >
      {/* Navigation Bar */}
      <div className="flex justify-between items-center p-4" 
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
          >
            Home
          </Button>
          <ThemeSelector />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <svg 
              className="w-20 h-20 mx-auto" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              style={{ color: currentTheme.colors.error }}
            >
              <path d="M12 15H12.01M12 9V12M4.98207 19H19.0179C20.5615 19 21.5233 17.3256 20.7455 16L13.7455 4C12.9677 2.67444 11.0323 2.67444 10.2545 4L3.25454 16C2.47672 17.3256 3.43849 19 4.98207 19Z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </div>
          
          <h1 
            className="text-3xl font-bold mb-4"
            style={{ color: currentTheme.colors.error }}
          >
            Access Denied
          </h1>
          
          <p 
            className="text-lg mb-6"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            You don't have permission to access this page. This area requires administrator privileges.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              onClick={handleHomeClick}
            >
              Return to Home
            </Button>
            
            <Button
              variant="primary"
              onClick={handleLoginClick}
            >
              Sign In as Admin
            </Button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-sm p-6" style={{ color: currentTheme.colors.textMuted }}>
        <p>InkMortal LLM Server</p>
        <p className="mt-1">© {new Date().getFullYear()} Personal Project</p>
      </div>
    </div>
  );
};

export default Unauthorized;