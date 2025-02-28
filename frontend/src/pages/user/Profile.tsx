import React, { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import UserProfile from '../../components/auth/UserProfile';
import ThemeSelector from '../../components/ui/ThemeSelector';
import Button from '../../components/ui/Button';

const Profile: React.FC = () => {
  const { currentTheme } = useTheme();
  const { isAuthenticated, loading } = useAuth();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.navigateTo('/login');
    }
  }, [isAuthenticated, loading]);
  
  // Handle home navigation
  const handleHomeClick = () => {
    window.navigateTo('/');
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
          <p style={{ color: currentTheme.colors.textPrimary }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 
            className="text-3xl font-bold mb-8 text-center"
            style={{ color: currentTheme.colors.accentPrimary }}
          >
            Your Profile
          </h1>
          
          <UserProfile />
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-sm p-6" style={{ color: currentTheme.colors.textMuted }}>
        <p>InkMortal LLM Server</p>
        <p className="mt-1">© {new Date().getFullYear()} Personal Project</p>
      </div>
    </div>
  );
};

export default Profile;