import React, { useState, FormEvent } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onRegisterClick }) => {
  const { currentTheme } = useTheme();
  const { regularLogin } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const success = await regularLogin(username, password);
      if (success) {
        if (onSuccess) onSuccess();
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 
        className="text-2xl font-semibold mb-6 text-center"
        style={{ color: currentTheme.colors.accentPrimary }}
      >
        Sign In
      </h2>
      
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
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block mb-1 font-medium"
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
            disabled={loading}
          />
        </div>
        
        <div>
          <label
            htmlFor="password"
            className="block mb-1 font-medium"
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
            disabled={loading}
          />
        </div>
        
        <Button
          type="submit"
          fullWidth
          disabled={loading}
          style={{
            background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
            boxShadow: `0 4px 15px ${currentTheme.colors.accentPrimary}40`,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
        
        {onRegisterClick && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onRegisterClick}
              className="text-sm font-medium hover:underline"
              style={{ color: currentTheme.colors.accentPrimary }}
            >
              Don't have an account? Register
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default LoginForm;