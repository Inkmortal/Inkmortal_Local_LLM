import React, { useState, FormEvent } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onLoginClick }) => {
  const { currentTheme } = useTheme();
  const { register, regularLogin } = useAuth();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    // Password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Registration token validation
    if (!token.trim()) {
      setError('Registration token is required');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    // Validate form inputs
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Register user
      const success = await register(username, email, password, token);
      
      if (success) {
        setSuccessMessage('Registration successful! You can now sign in.');
        
        // Auto login is now handled in the register function
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1000);
        }
      } else {
        setError('Registration failed. Please check your registration token and try again.');
      }
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
      console.error('Registration error:', err);
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
        Create Account
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
      
      {successMessage && (
        <div 
          className="mb-4 p-3 rounded-md text-center"
          style={{
            backgroundColor: `${currentTheme.colors.success}20`,
            color: currentTheme.colors.success,
          }}
        >
          {successMessage}
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
            htmlFor="email"
            className="block mb-1 font-medium"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Email
          </label>
          <input
            id="email"
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
          <p className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
            Must be at least 8 characters
          </p>
        </div>
        
        <div>
          <label
            htmlFor="confirmPassword"
            className="block mb-1 font-medium"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            htmlFor="token"
            className="block mb-1 font-medium"
            style={{ color: currentTheme.colors.textSecondary }}
          >
            Registration Token
          </label>
          <input
            id="token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full p-2 rounded-md border"
            style={{
              backgroundColor: currentTheme.colors.bgTertiary,
              color: currentTheme.colors.textPrimary,
              borderColor: currentTheme.colors.borderColor,
            }}
            required
            disabled={loading}
          />
          <p className="text-xs mt-1" style={{ color: currentTheme.colors.textMuted }}>
            Required to create an account. Contact an administrator to get a token.
          </p>
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
          {loading ? 'Creating Account...' : 'Register'}
        </Button>
        
        {onLoginClick && (
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={onLoginClick}
              className="text-sm font-medium hover:underline"
              style={{ color: currentTheme.colors.accentPrimary }}
            >
              Already have an account? Sign In
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default RegisterForm;