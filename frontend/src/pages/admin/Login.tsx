import React, { useState, useEffect, useCallback } from 'react';
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
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [setupTokenFetched, setSetupTokenFetched] = useState('');
  const [showTokenFetchForm, setShowTokenFetchForm] = useState(false);
  const [keySequence, setKeySequence] = useState<string[]>([]);

  // Track key presses for the special sequence
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Update the key sequence with the latest key
    setKeySequence(prev => {
      const updated = [...prev, e.key.toLowerCase()];
      // Only keep the last 20 keys to prevent memory build-up
      return updated.slice(-20);
    });
  }, []);

  // Check for the special sequence in the key presses
  useEffect(() => {
    // Add the keyboard event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Check if the key sequence contains the trigger pattern
    // The pattern is Ctrl+Alt+S
    const lastKeys = keySequence.slice(-3);
    if (
      lastKeys.length === 3 &&
      lastKeys[0] === 'control' &&
      lastKeys[1] === 'alt' &&
      lastKeys[2] === 's'
    ) {
      setShowTokenFetchForm(true);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [keySequence, handleKeyDown]);

  // Check if admin setup is required
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await fetch('/auth/admin/setup-status');
        const data = await response.json();
        
        if (!data.admin_exists) {
          setNeedsSetup(true);
          setMode('setup');
        }
      } catch (error) {
        console.error('Failed to check admin setup status:', error);
        setError('Unable to connect to the server. Please check your connection and try again.');
      }
    };
    
    checkSetupStatus();
  }, []);

  const handlePassphraseVerification = () => {
    // Hash the input passphrase using SHA-256
    const inputHash = crypto.SHA256(passphraseInput).toString();
    
    // Compare with the expected hash
    if (inputHash === EXPECTED_PASSPHRASE_HASH) {
      fetchSetupToken();
      setShowTokenInput(true);
      setPassphraseInput('');
    } else {
      setError('Invalid passphrase');
      setTimeout(() => setError(null), 3000);
    }
  };

  const fetchSetupToken = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/auth/admin/fetch-setup-token');
      
      if (response.ok) {
        const data = await response.json();
        setSetupTokenFetched(data.token || 'No token available. Admin account already exists.');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to fetch setup token');
      }
    } catch (error) {
      console.error('Error fetching setup token:', error);
      setError('Network error while fetching setup token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      // Use the standard OAuth2 password flow
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch('/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Store the token in localStorage
        localStorage.setItem('adminToken', data.access_token);
        localStorage.setItem('adminUsername', data.username);
        
        // Redirect to admin dashboard
        window.navigateTo('/admin');
      } else {
        if (!response.bodyUsed) {
          const data = await response.json();
          setError(data.detail || 'Login failed');
        } else {
          setError('Login failed');
        }
      }
    } catch (error) {
      setError('Network error during login. Please check your connection.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
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
      
      if (response.ok) {
        const data = await response.json();
        
        // Store the token
        localStorage.setItem('adminToken', data.access_token);
        localStorage.setItem('adminUsername', data.username);
        
        // Redirect to admin dashboard
        window.navigateTo('/admin');
      } else {
        if (!response.bodyUsed) {
          const data = await response.json();
          setError(data.detail || 'Admin setup failed');
        } else {
          setError('Admin setup failed');
        }
      }
    } catch (error) {
      setError('Network error during admin setup. Please check your connection.');
      console.error('Admin setup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeTokenFetchForm = () => {
    setShowTokenFetchForm(false);
    setShowTokenInput(false);
    setSetupTokenFetched('');
    setPassphraseInput('');
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

      {showTokenFetchForm && (
        <Card className="w-full max-w-md mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium" style={{ color: currentTheme.colors.accentPrimary }}>
              Admin Setup Token
            </h3>
            <button 
              onClick={closeTokenFetchForm} 
              className="text-sm p-1 rounded hover:bg-opacity-10 hover:bg-black"
              style={{ color: currentTheme.colors.textMuted }}
            >
              ✕
            </button>
          </div>

          {!showTokenInput ? (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: currentTheme.colors.textSecondary }}>
                Enter the passphrase to retrieve the admin setup token.
              </p>
              <input
                type="password"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                className="w-full p-2 rounded-md border"
                style={{
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.textPrimary,
                  borderColor: currentTheme.colors.borderColor,
                }}
                placeholder="Enter passphrase"
              />
              <Button 
                onClick={handlePassphraseVerification}
                fullWidth
              >
                Verify Passphrase
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm mb-2" style={{ color: currentTheme.colors.textSecondary }}>
                Admin setup token (only generated for first admin creation):
              </p>
              <div 
                className="p-3 bg-opacity-10 rounded-md font-mono text-sm break-all"
                style={{ 
                  backgroundColor: currentTheme.colors.bgTertiary,
                  color: currentTheme.colors.accentSecondary
                }}
              >
                {isLoading ? "Fetching token..." : setupTokenFetched || "No token available"}
              </div>
              {setupTokenFetched && (
                <Button 
                  onClick={() => {
                    setSetupToken(setupTokenFetched);
                    setMode('setup');
                    closeTokenFetchForm();
                  }}
                  fullWidth
                >
                  Use This Token
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      <Card className="w-full max-w-md">
        {error && (
          <div
            className="mb-4 p-3 rounded-md text-center"
            style={{
              backgroundColor: `${currentTheme.colors.error}20`,
              color: currentTheme.colors.error,
            }}
          >
            {error}
          </div>
        )}

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
            <div>
              <label
                htmlFor="setup-token"
                className="block mb-1"
                style={{ color: currentTheme.colors.textSecondary }}
              >
                Setup Token (from server logs)
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
              />
              <p className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
                Press Ctrl+Alt+S to fetch the setup token with passphrase
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