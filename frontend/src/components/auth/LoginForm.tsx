import React, { useState, FormEvent, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onRegisterClick }) => {
  const { currentTheme } = useTheme();
  const { regularLogin, connectionError, clearErrors } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Use connection error from auth context
  useEffect(() => {
    if (connectionError) {
      setError(connectionError);
    }
  }, [connectionError]);
  
  // Clear form errors when user changes input
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    clearErrors();
    setter(e.target.value);
  };
  
  // Form validation
  const validateForm = (): boolean => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError(null);
    clearErrors();
    
    // Validate form inputs
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Don't log sensitive information in production
      console.log(`Attempting login with username: ${username}`);
      const success = await regularLogin(username, password);
      
      if (success) {
        console.log('Login successful, calling onSuccess callback');
        if (onSuccess) onSuccess();
      } else {
        // If no connection error was set by the auth context, set a generic one
        if (!connectionError) {
          setError('Invalid username or password. Please try again.');
        }
        console.log('Login failed in component');
      }
    } catch (err) {
      setError('An unexpected error occurred during login. Please try again.');
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
            onChange={handleInputChange(setUsername)}
            className="w-full p-2 rounded-md border"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              color: currentTheme.colors.textPrimary,
              borderColor: currentTheme.colors.borderColor,
            }}
            autoComplete="username"
            required
            disabled={loading}
            aria-label="Username"
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
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={handleInputChange(setPassword)}
              className="w-full p-2 rounded-md border"
              style={{
                backgroundColor: currentTheme.colors.bgTertiary,
                color: currentTheme.colors.textPrimary,
                borderColor: currentTheme.colors.borderColor,
              }}
              autoComplete="current-password"
              required
              disabled={loading}
              aria-label="Password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{ color: currentTheme.colors.textSecondary }}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        <Button
          type="submit"
          fullWidth
          disabled={loading}
          style={{
            background: `linear-gradient(to right, ${currentTheme.colors.accentPrimary}, ${currentTheme.colors.accentSecondary})`,
            boxShadow: `0 4px 15px ${currentTheme.colors.accentPrimary}40`,
          }}
          aria-label={loading ? 'Signing in...' : 'Sign In'}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Signing in...
            </div>
          ) : 'Sign In'}
        </Button>
        
        <div className="mt-2 text-sm text-center">
          <button
            type="button"
            className="text-sm hover:underline"
            style={{ color: currentTheme.colors.accentPrimary }}
            onClick={() => alert("Password reset functionality will be implemented soon.")}
          >
            Forgot password?
          </button>
        </div>
        
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