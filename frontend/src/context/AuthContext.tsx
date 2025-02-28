import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchApi } from '../config/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  username: string | null;
  userEmail: string | null;
  userData: any;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Check authentication on mount
  useEffect(() => {
    const initialCheck = async () => {
      await checkAuth();
    };
    
    initialCheck();
  }, []);
  
  // Helper to store auth token
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
      
      const response = await fetchApi('/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      console.log('Admin login response status:', response.status);
      
      if (response.ok) {
        try {
          const responseText = await response.text();
          const data = JSON.parse(responseText);
          console.log('Admin login successful');
          
          // Store token and update auth state
          login(data.access_token, data.username, true);
          
          return true;
        } catch (e) {
          console.error('Error parsing login response:', e);
          setConnectionError('Invalid response format from server');
          setLoading(false);
          return false;
        }
      } else {
        let errorMessage = 'Invalid credentials';
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.detail || errorMessage;
            } catch (e) {
              errorMessage = errorText;
            }
          }
        } catch (e) {
          // Fallback to default error
        }
        
        setConnectionError(errorMessage);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error during admin login:', error);
      setConnectionError('Network error while logging in');
      setLoading(false);
      return false;
    }
  };
  
  // Regular user login handler
  const regularLogin = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      console.log('Attempting user login...');
      
      // Create form data for OAuth2 compatibility
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetchApi('/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      console.log('User login response status:', response.status);
      
      if (response.ok) {
        try {
          const responseText = await response.text();
          const data = JSON.parse(responseText);
          console.log('User login successful');
          
          // Store token and update auth state
          login(data.access_token, data.username, data.is_admin || false);
          if (data.email) {
            setUserEmail(data.email);
          }
          
          return true;
        } catch (e) {
          console.error('Error parsing login response:', e);
          setConnectionError('Invalid response format from server');
          setLoading(false);
          return false;
        }
      } else {
        let errorMessage = 'Invalid credentials';
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.detail || errorMessage;
            } catch (e) {
              errorMessage = errorText;
            }
          }
        } catch (e) {
          // Fallback to default error
        }
        
        setConnectionError(errorMessage);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error during user login:', error);
      setConnectionError('Network error while logging in');
      setLoading(false);
      return false;
    }
  };
  
  // User registration handler
  const register = async (username: string, email: string, password: string, token?: string): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      const body: any = {
        username,
        email,
        password,
      };
      
      // Add token if provided
      if (token) {
        body.token = token;
      }
      
      console.log('Attempting user registration...');
      const response = await fetchApi('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      
      console.log('Registration response status:', response.status);
      
      if (response.ok) {
        console.log('Registration successful');
        
        // After successful registration, attempt to log in with provided credentials
        const loginSuccess = await regularLogin(username, password);
        if (!loginSuccess) {
          setConnectionError('Registration successful but automatic login failed. Please try logging in manually.');
          setLoading(false);
        }
        
        return true;
      } else {
        let errorMessage = 'Registration failed';
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.detail || errorMessage;
            } catch (e) {
              errorMessage = errorText;
            }
          }
        } catch (e) {
          // Fallback to default error
        }
        
        setConnectionError(errorMessage);
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setConnectionError('Network error during registration');
      setLoading(false);
      return false;
    }
  };
  
  // Logout handler
  const logout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUsername(null);
    setUserEmail(null);
    setUserData(null);
    
    // Redirect based on previous role
    const redirectPath = isAdmin ? '/admin/login' : '/login';
    // Always use navigateTo for client-side navigation
    window.navigateTo(redirectPath);
  };
  
  const checkAuth = async (): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      console.log('Checking authentication...');
      // Get token from localStorage
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.log('No auth token found');
        setLoading(false);
        return false;
      }
      
      // Verify the token with backend
      const response = await fetchApi('/auth/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('Token verified, user data:', userData);
        
        // Update auth state
        setIsAuthenticated(true);
        setIsAdmin(userData.is_admin || false);
        setUsername(userData.username);
        setUserEmail(userData.email);
        setUserData(userData);
        setLoading(false);
        return true;
      } else {
        console.log('Token verification failed');
        // Clear invalid token
        localStorage.removeItem('authToken');
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setConnectionError('Network error while checking authentication');
      setLoading(false);
      return false;
    }
  };
  
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
export const withAuth = (Component: React.ComponentType<any>, requireAdmin: boolean = false) => {
  return (props: any) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    
    // Show loader while checking auth
    if (loading) {
      return <div>Loading...</div>;
    }
    
    // Check if authenticated
    if (!isAuthenticated) {
      // Redirect to login
      window.navigateTo(requireAdmin ? '/admin/login' : '/login');
      return null;
    }
    
    // Check admin requirement
    if (requireAdmin && !isAdmin) {
      // Redirect to unauthorized page
      window.navigateTo('/unauthorized');
      return null;
    }
    
    // Render protected component
    return <Component {...props} />;
  };
};