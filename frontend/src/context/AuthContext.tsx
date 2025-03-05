import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

const AuthContext = createContext<AuthContextType>(defaultAuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Simple token storage - no fancy format
  const storeToken = (token: string) => {
    localStorage.setItem('authToken', token);
    console.log("Token stored successfully");
  };

  // Log out and clear token
  const logout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUsername(null);
    setUserEmail(null);
    setUserData(null);
    
    // Navigate to home page
    navigate('/');
  };

  // Clear any error messages
  const clearErrors = () => {
    setConnectionError(null);
  };

  // Authenticate and store token
  const login = (token: string, username: string, isAdmin: boolean) => {
    storeToken(token);
    setIsAuthenticated(true);
    setIsAdmin(isAdmin);
    setUsername(username);
    setLoading(false);
    
    console.log(`Logged in as ${username}`, isAdmin ? '(Admin)' : '');
  };

  // Check if token is still valid
  const checkAuth = async (): Promise<boolean> => {
    try {
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
      
      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      // Don't log out the user here - might be a temporary network issue
      setConnectionError('Error verifying your authentication. Please try again later.');
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
    } catch (error) {
      console.error('Error during admin login:', error);
      setConnectionError('Connection error. Please try again later.');
      setLoading(false);
      return false;
    }
  };
  
  // Regular user login handler
  const regularLogin = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      // Create form data for OAuth2 compatibility
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      // Use our enhanced fetchApi with consistent response structure
      // Use the correct OAuth2 token endpoint
      const response = await fetchApi<{
        access_token: string;
        token_type: string;
        username: string;
        is_admin: boolean;
      }>('/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      if (response.success && response.data) {
        // Store token and update auth state
        login(response.data.access_token, response.data.username, response.data.is_admin);
        
        console.log('User login successful:', {
          username: response.data.username,
          isAdmin: response.data.is_admin,
          tokenProvided: !!response.data.access_token
        });
        
        return true;
      } else {
        // Login failed
        const errorMessage = response.error || 'Invalid credentials. Please try again.';
        console.error('Login failed:', errorMessage);
        
        // Add specific handling for network errors
        if (response.status === 0) {
          setConnectionError('Cannot connect to server. Please check your internet connection.');
        } else {
          setConnectionError(errorMessage);
        }
        
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error during login:', error);
      setConnectionError('Connection error. Please try again later.');
      setLoading(false);
      return false;
    }
  };
  
  // Register new user
  const register = async (
    username: string,
    email: string,
    password: string,
    token?: string
  ): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      // Create form data for OAuth2 compatibility - use URLSearchParams like the login endpoint
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('password', password);
      if (token) formData.append('token', token);
      
      // Use our enhanced fetchApi with consistent response structure
      const response = await fetchApi<{
        access_token: string;
        token_type: string;
        username: string;
      }>('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      if (response.success && response.data) {
        // Store token, update auth state, and save email
        login(response.data.access_token, response.data.username, false);
        setUserEmail(email); // Save the email to maintain consistency
        return true;
      } else {
        // Registration failed
        const errorMessage = response.error || 'Registration failed. Please try again.';
        
        // Add specific handling for network errors
        if (response.status === 0) {
          setConnectionError('Cannot connect to server. Please check your internet connection.');
        } else {
          setConnectionError(errorMessage);
        }
        
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setConnectionError('Connection error. Please try again later.');
      setLoading(false);
      return false;
    }
  };
  
  // Check JWT from localStorage on initial load
  useEffect(() => {
    const initialAuthCheck = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        console.log('Found token on initial load, verifying with backend');
        
        // Do NOT set authenticated until verified with backend
        // setIsAuthenticated(true); <- Removed this premature authentication
        
        // Check if token is valid with backend
        try {
          const valid = await checkAuth();
          if (!valid) {
            // Token invalid, clear state
            console.log('Token validation failed with backend on initial load');
            logout();
          } else {
            console.log('Token successfully validated on initial load');
            // Only set authenticated after validation
            setIsAuthenticated(true); 
          }
        } catch (error) {
          console.error('Error during initial auth check:', error);
          // Don't logout here - could be a temporary network issue
        } finally {
          setLoading(false);
        }
      } else {
        console.log('No auth token found on initial load');
        setLoading(false);
      }
    };
    
    initialAuthCheck();
  }, []);
  
  // Context value
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
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// HOC to protect routes
interface ComponentProps {
  [key: string]: unknown;
}

// Modern auth protection using React Router
export const RequireAuth = ({
  children,
  requireAdmin = false
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use effect to handle redirection when auth state changes
  React.useEffect(() => {
    if (!loading && (!isAuthenticated || (requireAdmin && !isAdmin))) {
      // Use proper redirect strategy based on what they're trying to access
      let redirectPath;
      
      if (requireAdmin) {
        // Admin routes go to admin login
        redirectPath = '/admin/login';
      } else if (location.pathname.includes('/chat')) {
        // Chat routes go to regular login
        redirectPath = '/login';
      } else {
        // Other routes go to unauthorized page
        redirectPath = '/unauthorized';
      }
      
      // Store the location they were trying to access for later redirect
      navigate(redirectPath, { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [isAuthenticated, isAdmin, loading, requireAdmin, navigate, location]);
  
  // Show loading indicator
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
    </div>;
  }
  
  // Don't render children if not authenticated
  // The useEffect above will handle redirection
  if (!isAuthenticated || (requireAdmin && !isAdmin)) {
    return null;
  }
  
  // Render children when authenticated
  return <>{children}</>;
};

// Legacy HOC for backward compatibility
export const withAuth = <P extends ComponentProps>(
  Component: React.ComponentType<P>, 
  requireAdmin: boolean = false
) => {
  return (props: P) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Redirect to login if not authenticated or admin access required but not admin
    if (!loading && (!isAuthenticated || (requireAdmin && !isAdmin))) {
      // Align redirection logic with RequireAuth component for consistency
      if (requireAdmin) {
        // Admin routes go to admin login
        navigate('/admin/login', { state: { from: location.pathname } });
      } else if (location.pathname.includes('/chat')) {
        // Chat routes go to regular login
        navigate('/login', { state: { from: location.pathname } });
      } else {
        // Other routes go to unauthorized page
        navigate('/unauthorized', { state: { from: location.pathname } });
      }
      return null;
    }
    
    // Show loading indicator while checking auth status
    if (loading) {
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }
    
    // Render the protected component
    return <Component {...props} />;
  };
};