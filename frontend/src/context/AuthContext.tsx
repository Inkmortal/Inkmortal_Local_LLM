import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchApi, ApiResponse } from '../config/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  username: string | null;
  userEmail: string | null;
  userData: {
    username: string;
    email: string;
    is_admin: boolean;
    [key: string]: any;
  } | null;
  connectionError: string | null;
  login: (token: string, username: string, isAdmin: boolean) => void;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  regularLogin: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, token?: string) => Promise<boolean>;
  checkAuth: () => Promise<boolean>;
  logout: () => void;
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
  // Define a proper user data interface instead of using 'any'
  interface UserData {
    username: string;
    email: string;
    is_admin: boolean;
    [key: string]: any; // For additional fields we might not know about
  }
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Check JWT from localStorage on initial load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Set initially authenticated but will verify with backend
      setIsAuthenticated(true);
      
      // Check if token is valid
      checkAuth().then((valid) => {
        if (!valid) {
          // Token invalid, clear state
          logout();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);
  
  // Store token in localStorage
  const storeToken = (token: string) => {
    localStorage.setItem('authToken', token);
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
        return true;
      } else {
        // Login failed
        const errorMessage = response.error || 'Invalid credentials. Please try again.';
        setConnectionError(errorMessage);
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
      // Create request body
      const body = JSON.stringify({
        username,
        email,
        password,
        token
      });
      
      // Use our enhanced fetchApi with consistent response structure
      const response = await fetchApi<{
        access_token: string;
        token_type: string;
        username: string;
      }>('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      });
      
      if (response.success && response.data) {
        // Store token and update auth state
        login(response.data.access_token, response.data.username, false);
        return true;
      } else {
        // Registration failed
        const errorMessage = response.error || 'Registration failed. Please try again.';
        setConnectionError(errorMessage);
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
  
  // Check if token is still valid
  const checkAuth = async (): Promise<boolean> => {
    try {
      // Use our enhanced fetchApi with consistent response structure
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
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
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
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// HOC to protect routes
// Type for any component props to avoid using 'any'
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
      const redirectPath = requireAdmin ? '/admin/login' : '/unauthorized';
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
      // Redirect to appropriate login page
      if (requireAdmin) {
        navigate('/admin/login', { state: { from: location.pathname } });
      } else {
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
