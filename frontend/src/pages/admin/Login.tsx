import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ThemeSelector from '../../components/ui/ThemeSelector';

type LoginMode = 'login' | 'setup';

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

  // Check if admin setup is required
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await fetch('/api/auth/admin/setup-status');
        const data = await response.json();
        
        if (!data.admin_exists) {
          setNeedsSetup(true);
          setMode('setup');
        }
      } catch (error) {
        console.error('Failed to check admin setup status:', error);
      }
    };
    
    checkSetupStatus();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      // Use the standard OAuth2 password flow
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch('/api/auth/admin/login', {
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
        const data = await response.json();
        setError(data.detail || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred during login');
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
      const response = await fetch('/api/auth/admin/setup', {
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
        const data = await response.json();
        setError(data.detail || 'Admin setup failed');
      }
    } catch (error) {
      setError('An error occurred during admin setup');
      console.error('Admin setup error:', error);
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