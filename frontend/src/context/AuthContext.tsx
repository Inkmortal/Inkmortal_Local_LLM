import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchApi, ApiResponse } from '../config/api';

interface UserData {
  username: string;
  email: string;
  is_admin: boolean;
  [key: string]: any; // For additional fields we might not know about
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  username: string | null;
  userEmail: string | null;
  userData: UserData | null;
  connectionError: string | null;
  login: (token: string, username: string, isAdmin: boolean) => void;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  regularLogin: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, token?: string) => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
  logout: () => void;
  clearErrors: () => void;
}

interface AuthData {
  token: string;
  expiresAt: string;
  username: string;
  isAdmin: boolean;
}

// Setup broadcast channel for cross-tab communication
let authChannel: BroadcastChannel | null = null;
try {
  authChannel = new BroadcastChannel('auth_channel');
} catch (e) {
  console.warn('BroadcastChannel not supported in this browser.');
}

const defaultAuthContext: AuthContextType = {
  isAuthenticated: false,
  isAdmin: false,
  loading: true,
  username: null,
  userEmail: null,
  userData: null,
  connectionError: null,
  login: () => {},
  adminLogin: async () => false,
  regularLogin: async () => false,
  register: async () => false,
  checkAuth: async () => false,
  logout: () => {},
  clearErrors: () => {},
};

// Create context
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Use auth hook
export const useAuth = () => useContext(AuthContext);

// Helper functions for token storage
const saveToken = (token: string, username: string, isAdmin: boolean): void => {
  // Create expiration time (24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  // Store token with expiration in localStorage
  const tokenData: AuthData = {
    token,
    expiresAt: expiresAt.toISOString(),
    username,
    isAdmin
  };
  
  // Store both token (for backward compatibility) and full token data
  localStorage.setItem('authToken', token);
  localStorage.setItem('authData', JSON.stringify(tokenData));
  
  // Create a cookie for additional persistence (useful for cross-tab auth)
  document.cookie = `auth_session=${username}; path=/; max-age=86400; SameSite=Strict`;
  
  // Broadcast login to other tabs if supported
  if (authChannel) {
    authChannel.postMessage({ type: 'login', username, isAdmin });
  }
};

const removeToken = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authData');
  
  // Clear auth cookie
  document.cookie = 'auth_session=; path=/; max-age=0; SameSite=Strict';
  
  // Broadcast logout to other tabs if supported
  if (authChannel) {
    authChannel.postMessage({ type: 'logout' });
  }
};

const getAuthData = (): AuthData | null => {
  try {
    const tokenData = localStorage.getItem('authData');
    if (!tokenData) return null;
    
    const data: AuthData = JSON.parse(tokenData);
    
    // Check if token is expired
    const expiresAt = new Date(data.expiresAt);
    if (expiresAt < new Date()) {
      // Token expired, clean up
      removeToken();
      return null;
    }
    
    return data;
  } catch (e) {
    // In case of any parsing errors, clean up and return null
    removeToken();
    return null;
  }
};

// Auth Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Refs to prevent duplicate auth calls
  const authCheckInProgressRef = useRef(false);
  const lastAuthCheckTimeRef = useRef(0);
  
  // Clear any auth-related errors
  const clearErrors = () => {
    setConnectionError(null);
  };
  
  // Listen for auth events from other tabs
  useEffect(() => {
    if (!authChannel) return;
    
    const handleAuthEvent = (event: MessageEvent) => {
      if (event.data.type === 'login') {
        setIsAuthenticated(true);
        setIsAdmin(event.data.isAdmin);
        setUsername(event.data.username);
        setLoading(false);
      } else if (event.data.type === 'logout') {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUsername(null);
        setUserEmail(null);
        setUserData(null);
        navigate('/login');
      }
    };
    
    authChannel.addEventListener('message', handleAuthEvent);
    return () => {
      authChannel?.removeEventListener('message', handleAuthEvent);
    };
  }, [navigate]);
  
  // Initialize authentication state on load
  useEffect(() => {
    // Try to get stored auth data first
    const authData = getAuthData();
    
    if (authData) {
      // We have a valid token with stored data
      setIsAuthenticated(true);
      setIsAdmin(authData.isAdmin);
      setUsername(authData.username);
      
      // Still verify with backend to make sure the token is valid
      checkAuth().then((isValid) => {
        setLoading(false);
        
        if (!isValid) {
          // Token was invalid according to backend, redirect to login for protected routes
          const currentPath = location.pathname;
          
          if (currentPath.startsWith('/admin') || 
              currentPath.startsWith('/chat') || 
              currentPath.startsWith('/user')) {
            navigate('/login', { state: { from: currentPath } });
          }
        }
      });
    } else {
      // No valid stored token, check for token-only (backward compatibility)
      const token = localStorage.getItem('authToken');
      
      if (token) {
        checkAuth().then((isValid) => {
          setLoading(false);
          
          if (!isValid) {
            const currentPath = location.pathname;
            
            if (currentPath.startsWith('/admin') || 
                currentPath.startsWith('/chat') || 
                currentPath.startsWith('/user')) {
              navigate('/login', { state: { from: currentPath } });
            }
          }
        });
      } else {
        // No token at all, definitely not authenticated
        setLoading(false);
      }
    }
  }, [location.pathname, navigate]);
  
  // Logout handler
  const logout = () => {
    removeToken();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUsername(null);
    setUserEmail(null);
    setUserData(null);
    navigate('/login');
  };
  
  // Login handler (to be called after successful authentication)
  const login = (token: string, username: string, isAdmin: boolean) => {
    saveToken(token, username, isAdmin);
    setIsAuthenticated(true);
    setIsAdmin(isAdmin);
    setUsername(username);
    setLoading(false);
    
    console.log(`Logged in as ${username}`, isAdmin ? '(Admin)' : '');
  };
  
  // Check if token is still valid
  const checkAuth = async (): Promise<boolean> => {
    // Check if token exists first before making the API call
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found in checkAuth, returning false without API call');
      return false;
    }
    
    // Prevent duplicate auth checks
    if (authCheckInProgressRef.current) {
      console.log('Auth check already in progress, skipping duplicate call');
      return isAuthenticated; // Return current state
    }
    
    // Throttle auth checks to max once every 5 seconds
    const now = Date.now();
    if (now - lastAuthCheckTimeRef.current < 5000) {
      console.log('Auth check throttled (within 5 seconds of previous check)');
      return isAuthenticated; // Return current state
    }
    
    // Mark check as in progress and update last check time
    authCheckInProgressRef.current = true;
    lastAuthCheckTimeRef.current = now;
    
    try {
      console.log('Token found, verifying with backend...');
      const response = await fetchApi<{
        username: string;
        email: string;
        is_admin: boolean;
      }>('/auth/me', {
        method: 'GET',
      });
      
      if (response.success && response.data) {
        // Token is valid, update auth data with fresh data from backend
        const userData = response.data;
        saveToken(token, userData.username, userData.is_admin);
        
        // Update user information
        setUsername(userData.username);
        setUserEmail(userData.email);
        setIsAdmin(userData.is_admin);
        setUserData(userData);
        setConnectionError(null);
        authCheckInProgressRef.current = false;
        return true;
      }
      
      // Handle specific authentication errors
      if (response.status === 401) {
        console.log('Token is invalid or expired according to server');
        logout();
      } else if (response.status === 0) {
        // Network error
        setConnectionError('Cannot connect to the server. Please check your internet connection.');
      } else {
        // Other errors
        setConnectionError(`Authentication error: ${response.error || 'Unknown error'}`);
      }
      
      authCheckInProgressRef.current = false;
      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      // Don't log out the user here - might be a temporary network issue
      setConnectionError('Error verifying your authentication. Please try again later.');
      authCheckInProgressRef.current = false;
      return false;
    }
  };
  
  // Admin login handler
  const adminLogin = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      console.log('Attempting admin login...');
      
      // Create form data for OAuth2 compatibility
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      // OAuth2 requires grant_type for standard compatibility
      formData.append('grant_type', 'password');
      
      // Use our enhanced fetchApi with consistent response structure
      const response = await fetchApi<{
        access_token: string;
        token_type: string;
        username: string;
        is_admin: boolean;
      }>('/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      console.log('Admin login response:', response);
      
      if (response.success && response.data) {
        // Store token and update auth state
        login(response.data.access_token, response.data.username, response.data.is_admin);
        
        // Explicitly redirect to admin dashboard
        navigate('/admin');
        
        return true;
      } else {
        // Login failed
        const errorMessage = response.error || 'Invalid credentials. Please try again.';
        setConnectionError(errorMessage);
        setLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      setConnectionError(error.message || 'Login failed. Please try again.');
      setLoading(false);
      return false;
    }
  };
  
  // Regular user login handler
  const regularLogin = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      console.log('Attempting regular user login...');
      
      // Create form data for OAuth2 compatibility
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('grant_type', 'password');
      
      const response = await fetchApi<{
        access_token: string;
        token_type: string;
        username: string;
        is_admin: boolean;
      }>('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      if (response.success && response.data) {
        // Store token and update auth state
        login(response.data.access_token, response.data.username, response.data.is_admin);
        
        // Explicit redirect to home page (chat or previous if available)
        const { state } = location;
        const destination = state && typeof state === 'object' && 'from' in state
          ? String(state.from) 
          : '/chat';
        
        navigate(destination);
        
        return true;
      } else {
        // Login failed
        const errorMessage = response.error || 'Invalid credentials. Please try again.';
        setConnectionError(errorMessage);
        setLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error('Regular login error:', error);
      setConnectionError(error.message || 'Login failed. Please try again.');
      setLoading(false);
      return false;
    }
  };
  
  // Register handler
  const register = async (username: string, email: string, password: string, token?: string): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      console.log('Attempting registration...');
      
      const registerData = token 
        ? { username, email, password, token } 
        : { username, email, password };
      
      // Use our consistent API function
      const response = await fetchApi<{
        access_token: string;
        token_type: string;
        username: string;
        is_admin: boolean;
      }>('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });
      
      if (response.success && response.data) {
        // Registration auto-logs in the user
        login(response.data.access_token, response.data.username, response.data.is_admin);
        
        // Redirect to home page
        navigate('/chat');
        
        return true;
      } else {
        // Registration failed
        const errorMessage = response.error || 'Registration failed. Please try again.';
        setConnectionError(errorMessage);
        setLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setConnectionError(error.message || 'Registration failed. Please try again.');
      setLoading(false);
      return false;
    }
  };
  
  // Prepare context value
  const contextValue: AuthContextType = {
    isAuthenticated,
    isAdmin,
    loading,
    username,
    userEmail,
    userData,
    connectionError,
    login,
    adminLogin,
    regularLogin,
    register,
    checkAuth,
    logout,
    clearErrors,
  };
  
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// RequireAuth component for route protection
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login page with the return url
      navigate('/login', { 
        state: { from: location.pathname }
      });
    }
  }, [isAuthenticated, loading, navigate, location]);
  
  // Show nothing while checking authentication
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-gray-500 rounded-full border-t-transparent"></div>
    </div>;
  }
  
  // Only render children when authenticated
  return isAuthenticated ? <>{children}</> : null;
};

export default AuthContext;