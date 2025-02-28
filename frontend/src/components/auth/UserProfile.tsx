import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

interface UserProfileProps {
  onLogout?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onLogout }) => {
  const { currentTheme } = useTheme();
  const { username, userEmail, isAdmin, userData, logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };
  
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div 
        className="p-6 rounded-lg shadow-lg"
        style={{ 
          backgroundColor: currentTheme.colors.bgSecondary,
          borderColor: currentTheme.colors.borderColor,
          boxShadow: `0 10px 15px -3px ${currentTheme.colors.shadowColor}30`
        }}
      >
        <div className="flex items-center mb-6">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mr-4 text-2xl font-bold"
            style={{ 
              backgroundColor: currentTheme.colors.accentPrimary,
              color: '#fff' 
            }}
          >
            {username?.charAt(0).toUpperCase()}
          </div>
          
          <div>
            <h2 
              className="text-2xl font-bold"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              {username}
            </h2>
            <p style={{ color: currentTheme.colors.textSecondary }}>
              {isAdmin ? 'Administrator' : 'User'}
            </p>
          </div>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <p 
              className="text-sm font-medium mb-1"
              style={{ color: currentTheme.colors.textMuted }}
            >
              Email
            </p>
            <p 
              className="font-medium"
              style={{ color: currentTheme.colors.textPrimary }}
            >
              {userEmail}
            </p>
          </div>
          
          {userData?.created_at && (
            <div>
              <p 
                className="text-sm font-medium mb-1"
                style={{ color: currentTheme.colors.textMuted }}
              >
                Member Since
              </p>
              <p 
                className="font-medium"
                style={{ color: currentTheme.colors.textPrimary }}
              >
                {formatDate(userData.created_at)}
              </p>
            </div>
          )}
          
          <div>
            <p 
              className="text-sm font-medium mb-1"
              style={{ color: currentTheme.colors.textMuted }}
            >
              Account Type
            </p>
            <div 
              className="inline-block px-3 py-1 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: isAdmin 
                  ? `${currentTheme.colors.warning}20` 
                  : `${currentTheme.colors.success}20`,
                color: isAdmin 
                  ? currentTheme.colors.warning 
                  : currentTheme.colors.success
              }}
            >
              {isAdmin ? 'Administrator' : 'Regular User'}
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
          >
            Sign Out
          </Button>
          
          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.navigateTo('/admin')}
            >
              Admin Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;