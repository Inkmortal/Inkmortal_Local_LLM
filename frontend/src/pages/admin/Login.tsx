import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fetchApi, checkBackendConnection } from '../../config/api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ThemeSelector from '../../components/ui/ThemeSelector';
import ROUTES from '../../routes.constants';

type LoginMode = 'login' | 'setup';

// The expected passphrase ("i will defy the heavens")
const EXPECTED_PASSPHRASE = "i will defy the heavens";

const AdminLogin: React.FC = () => {
  const { currentTheme } = useTheme();
  const { login, adminLogin } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [mode, setMode] = useState<LoginMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  // Secret question states
  const [secretAnswer, setSecretAnswer] = useState('');
  const [showSecretQuestion, setShowSecretQuestion] = useState(false);
  const [setupTokenFetched, setSetupTokenFetched] = useState('');

  // Navigate to home
  const handleHomeClick = () => {
    navigate(ROUTES.HOME);
  };

  // Check backend connection and admin setup status on component mount
  useEffect(() => {
    const initialize = async () => {
      // First check if we can connect to the backend
      try {
        const connected = await checkBackendConnection();
        if (!connected) {
          setConnectionStatus('error');
          setError('Cannot connect to the backend server at http://localhost:8000. Please make sure it is running.');
          return;
        }
        
        setConnectionStatus('connected');
        
        // Now check if admin setup is required
        try {
          console.log('Checking admin setup status...');
          const response = await fetchApi('/auth/admin/setup-status');
          
          if (response.success && response.data) {
            console.log('Admin exists?', response.data.admin_exists);
            
            if (!response.data.admin_exists) {
              console.log('No admin exists, showing setup form');
              setNeedsSetup(true);
              setMode('setup');
              // Automatically show secret question
              setShowSecretQuestion(true);
            } else {
              console.log('Admin exists, showing login form');
              setMode('login');
            }
          } else {
            setError('Error checking admin setup status: ' + (response.error || 'Unknown error'));
          }
        } catch (error) {
          console.error('Error during admin status check:', error);
          setError('Error checking admin setup status. Please try again later.');
        }
      } catch (error) {
        console.error('Connection check failed:', error);
        setConnectionStatus('error');
        setError('Cannot connect to the backend server. Please ensure it is running on port 8000.');
      } finally {
        setIsLoading(false);
      }
    };
    
    setIsLoading(true);
    initialize();
  }, []);

  // Handle secret question verification
  const verifySecret = () => {
    console.log('Verifying secret answer...');
    
    // Compare with expected passphrase directly
    if (secretAnswer.trim().toLowerCase() === EXPECTED_PASSPHRASE.toLowerCase()) {
      console.log('Secret verified, fetching token');
      fetchSetupToken();
    } else {
      console.log('Incorrect answer');
      setError('That is not the secret to eternal life.');
      setTimeout(() => setError(null), 3000);
    }
  };

  // Fetch admin setup token
  const fetchSetupToken = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching setup token...');
      
      const response = await fetchApi('/auth/admin/fetch-setup-token');
      
      if (response.success && response.data) {
        console.log('Parsed token data:', response.data);
        if (response.data.token) {
          setSetupTokenFetched(response.data.token);
          setSetupToken(response.data.token); // Auto-fill the token field
        } else {
          setError('No token available. An admin account may already exist.');
        }
      } else {
        setError('Failed to fetch setup token: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Network error fetching token:', error);
      setError('Network error while fetching setup token');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    console.log('Attempting login with username:', username);
    
    try {
      // Use the adminLogin function from Auth context
      const success = await adminLogin(username, password);
      
      if (success) {
        // AuthContext will handle the redirect automatically
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error('Error during login:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle admin setup form submission
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    console.log('Attempting admin setup with username:', username);
    
    try {
      console.log('Sending admin setup request...');
      const response = await fetchApi('/auth/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          token: setupToken,
        }),
      });
      
      console.log('Setup response status:', response.status);
      
      if (response.success && response.data) {
        console.log('Admin setup successful, token received');
        
        // Use AuthContext login function
        login(response.data.access_token, response.data.username, true);
        
        // AuthContext will handle the redirect
      } else {
        setError('Admin setup failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error('Error during admin setup:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
              Seadragon Admin
            </h1>
            <div className="text-xs" style={{ color: currentTheme.colors.textMuted }}>
              Management Console
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            size="sm"
            variant="ghost"
            onClick={handleHomeClick}
            className="hover-float"
          >
            Home
          </Button>
          <ThemeSelector />
        </div>
      </div>

      <div className="mb-8 text-center mt-16">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ color: currentTheme.colors.accentPrimary }}
        >
          Admin Portal
        </h1>
        <h2 className="text-xl" style={{ color: currentTheme.colors.textSecondary }}>
          {mode === 'login' ? 'Sign In' : 'Admin Setup'}
        </h2>
      </div>

      {error && (
        <Card className="w-full max-w-md mb-4">
          <div
            className="p-3 rounded-md text-center"
            style={{
              backgroundColor: `${currentTheme.colors.error}20`,
              color: currentTheme.colors.error,
            }}
          >
            {error}
          </div>
        </Card>
      )}

      {/* Secret Question Form */}
      {mode === 'setup' && needsSetup && !setupTokenFetched && (
        <Card className="w-full max-w-md mb-4" hoverEffect>
          <h3 
            className="text-lg font-medium mb-4"
            style={{ color: currentTheme.colors.accentSecondary }}
          >
            First Admin Setup
          </h3>
          <p className="mb-4" style={{ color: currentTheme.colors.textSecondary }}>
            To create the first admin account, you need to retrieve a setup token by answering the secret question.
          </p>
          
          <div className="space-y-4">
            <div>
              <label
                htmlFor="secret-question"
                className="block mb-1 font-medium"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                What is the secret to eternal life?
              </label>
              <input
                id="secret-question"
                type="text"
                value={secretAnswer}
                onChange={(e) => setSecretAnswer(e.target.value)}
                className="w-full p-2 rounded-md border"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor,
                }}
                placeholder="Enter your answer"
              />
            </div>
            
            <Button 
              onClick={verifySecret} 
              fullWidth
              disabled={isLoading || !secretAnswer.trim()}
            >
              {isLoading ? 'Checking...' : 'Submit Answer'}
            </Button>
          </div>
        </Card>
      )}

      {/* Main Form (Login or Setup) */}
      <Card className="w-full max-w-md" hoverEffect>
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block mb-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-2 rounded-md border"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor,
                }}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 rounded-md border"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor,
                }}
                required
              />
            </div>

            <Button
              type="submit"
              fullWidth
              disabled={isLoading}
              style={{
                background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                boxShadow: `0 4px 15px ${currentTheme.colors.accentPrimary}40`,
              }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>

            {needsSetup && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setMode('setup')}
                  className="text-sm"
                  style={{ color: currentTheme.colors.accentPrimary }}
                  type="button"
                >
                  Need to set up admin account?
                </button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleSetup} className="space-y-4">
            {setupTokenFetched ? (
              <>
                <div>
                  <label
                    htmlFor="setup-token"
                    className="block mb-1"
                    style={{ color: currentTheme.colors.textSecondary }}
                  >
                    Setup Token
                  </label>
                  <input
                    id="setup-token"
                    type="text"
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    className="w-full p-2 rounded-md border font-mono"
                    style={{
                      backgroundColor: currentTheme.colors.bgTertiary,
                      color: currentTheme.colors.textPrimary,
                      borderColor: currentTheme.colors.borderColor,
                    }}
                    required
                    readOnly
                  />
                  <p className="text-xs mt-1" style={{ color: currentTheme.colors.success }}>
                    Token fetched successfully!
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="setup-username"
                    className="block mb-1"
                    style={{ color: currentTheme.colors.textSecondary }}
                  >
                    Admin Username
                  </label>
                  <input
                    id="setup-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 rounded-md border"
                    style={{
                      backgroundColor: currentTheme.colors.bgTertiary,
                      color: currentTheme.colors.textPrimary,
                      borderColor: currentTheme.colors.borderColor,
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="setup-email"
                    className="block mb-1"
                    style={{ color: currentTheme.colors.textSecondary }}
                  >
                    Email
                  </label>
                  <input
                    id="setup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 rounded-md border"
                    style={{
                      backgroundColor: currentTheme.colors.bgTertiary,
                      color: currentTheme.colors.textPrimary,
                      borderColor: currentTheme.colors.borderColor,
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="setup-password"
                    className="block mb-1"
                    style={{ color: currentTheme.colors.textSecondary }}
                  >
                    Password
                  </label>
                  <input
                    id="setup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 rounded-md border"
                    style={{
                      backgroundColor: currentTheme.colors.bgTertiary,
                      color: currentTheme.colors.textPrimary,
                      borderColor: currentTheme.colors.borderColor,
                    }}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  fullWidth
                  disabled={isLoading}
                  style={{
                    background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
                    boxShadow: `0 4px 15px ${currentTheme.colors.accentPrimary}40`,
                  }}
                >
                  {isLoading ? 'Setting up...' : 'Create Admin Account'}
                </Button>
              </>
            ) : (
              <div className="text-center p-4">
                <p style={{ color: currentTheme.colors.textSecondary }}>
                  Please answer the secret question above to continue with admin setup.
                </p>
              </div>
            )}

            {!needsSetup && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setMode('login')}
                  className="text-sm"
                  style={{ color: currentTheme.colors.accentPrimary }}
                  type="button"
                >
                  Already have an admin account? Login
                </button>
              </div>
            )}
          </form>
        )}
      </Card>

      <div className="mt-8 text-center text-sm" style={{ color: currentTheme.colors.textMuted }}>
        <p>Seadragon LLM Server Admin Interface</p>
        <p className="mt-1">© {new Date().getFullYear()} Personal Project</p>
      </div>
    </div>
  );
};

export default AdminLogin;