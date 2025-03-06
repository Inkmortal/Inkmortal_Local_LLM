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
  
  // Initialize authentication state on load
  useEffect(() => {
    // Read token from storage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      // A token exists, so try to verify if it's still valid
      checkAuth().then((isValid) => {
        setLoading(false);
        
        if (!isValid) {
          // Token was invalid, make sure we redirect to the login page
          // but only if we're trying to access a protected route
          const currentPath = location.pathname;
          
          // Add more protected routes as needed
          if (currentPath.startsWith('/admin') || 
              currentPath.startsWith('/chat') || 
              currentPath.startsWith('/user')) {
            navigate('/login', { state: { from: currentPath } });
          }
        }
      });
    } else {
      // No token found, we're definitely not authenticated
      setLoading(false);
    }
  }, []);
  
  // Logout handler
  const logout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUsername(null);
    setUserEmail(null);
    setUserData(null);
    navigate('/login');
  };
  
  // Login handler (to be called after successful authentication)
  const login = (token: string, username: string, isAdmin: boolean) => {
    localStorage.setItem('authToken', token);
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
        // Update user information
        setUsername(response.data.username);
        setUserEmail(response.data.email);
        setIsAdmin(response.data.is_admin);
        setUserData(response.data);
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

export default AuthContext;