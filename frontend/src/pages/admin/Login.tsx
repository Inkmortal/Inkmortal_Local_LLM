import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ThemeSelector from '../../components/ui/ThemeSelector';
import crypto from 'crypto-js';

type LoginMode = 'login' | 'setup';

// The expected passphrase hash (SHA-256 of "i will defy the heavens")
const EXPECTED_PASSPHRASE_HASH = "8c1ba38c3d7351b7a56a48a9bb14bf754d2099e069c07c27ddc0d35e8d35e501";

const AdminLogin: React.FC = () => {
  const { currentTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [mode, setMode] = useState<LoginMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  
  // Secret question states
  const [secretAnswer, setSecretAnswer] = useState('');
  const [showSecretQuestion, setShowSecretQuestion] = useState(false);
  const [setupTokenFetched, setSetupTokenFetched] = useState('');

  // Check if admin setup is required on component mount
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        console.log('Checking admin setup status...');
        const response = await fetch('/auth/admin/setup-status');
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Admin exists?', data.admin_exists);
          
          if (!data.admin_exists) {
            console.log('No admin exists, showing setup form');
            setNeedsSetup(true);
            setMode('setup');
          } else {
            console.log('Admin exists, showing login form');
          }
        } else {
          const errorText = await response.text();
          console.error('Error checking admin status:', errorText);
          setError('Error checking admin status: ' + errorText);
        }
      } catch (error) {
        console.error('Network error checking admin status:', error);
        setError('Unable to connect to server. Please check if the backend is running.');
      }
    };
    
    checkSetupStatus();
  }, []);

  // Handle secret question verification
  const verifySecret = () => {
    console.log('Verifying secret answer...');
    // Hash the answer with SHA-256
    const inputHash = crypto.SHA256(secretAnswer).toString();
    console.log('Answer hash:', inputHash);
    
    // Compare with expected hash
    if (inputHash === EXPECTED_PASSPHRASE_HASH) {
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
      
      const response = await fetch('/auth/admin/fetch-setup-token');
      console.log('Token fetch response status:', response.status);
      
      const responseText = await response.text();
      console.log('Token response text:', responseText);
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed token data:', data);
          if (data.token) {
            setSetupTokenFetched(data.token);
            setSetupToken(data.token); // Auto-fill the token field
          } else {
            setError('No token available. An admin account may already exist.');
          }
        } catch (e) {
          console.error('Error parsing token response:', e);
          setError('Invalid response format from server');
        }
      } else {
        setError('Failed to fetch setup token: ' + responseText);
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
      // Use the standard OAuth2 password flow
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      console.log('Sending login request...');
      const response = await fetch('/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      console.log('Login response status:', response.status);
      const responseText = await response.text();
      console.log('Login response text:', responseText);
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('Login successful, token received');
          
          // Store token and username in localStorage
          localStorage.setItem('adminToken', data.access_token);
          localStorage.setItem('adminUsername', data.username);
          
          // Redirect to admin dashboard
          window.navigateTo('/admin');
        } catch (e) {
          console.error('Error parsing login response:', e);
          setError('Invalid response format from server');
        }
      } else {
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.detail || 'Login failed');
        } catch {
          setError('Login failed: ' + responseText);
        }
      }
    } catch (error) {
      console.error('Network error during login:', error);
      setError('Network error during login. Please check your connection.');
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
      const response = await fetch('/auth/admin/setup', {
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
      const responseText = await response.text();
      console.log('Setup response text:', responseText);
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('Admin setup successful, token received');
          
          // Store token and username in localStorage
          localStorage.setItem('adminToken', data.access_token);
          localStorage.setItem('adminUsername', data.username);
          
          // Redirect to admin dashboard
          window.navigateTo('/admin');
        } catch (e) {
          console.error('Error parsing setup response:', e);
          setError('Invalid response format from server');
        }
      } else {
        try {
          const errorData = JSON.parse(responseText);
          setError(errorData.detail || 'Admin setup failed');
        } catch {
          setError('Admin setup failed: ' + responseText);
        }
      }
    } catch (error) {
      console.error('Network error during admin setup:', error);
      setError('Network error during admin setup. Please check your connection.');
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
      }}
    >
      <div className="fixed top-4 right-4">
        <ThemeSelector />
      </div>

      <div className="mb-8 text-center">
        <h1
          className="text-4xl font-bold mb-2"
          style={{ color: currentTheme.colors.accentPrimary }}
        >
          Seadragon LLM
        </h1>
        <h2 className="text-xl" style={{ color: currentTheme.colors.textSecondary }}>
          {mode === 'login' ? 'Admin Login' : 'Admin Setup'}
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
        <Card className="w-full max-w-md mb-4">
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
      <Card className="w-full max-w-md">
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