import React, { createContext, useState, useEffect, useContext } from 'react';
import { fetchApi, checkBackendConnection } from '../config/api';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  loading: boolean;
  connectionError: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  username: null,
  loading: true,
  connectionError: null,
  login: () => {},
  logout: () => {},
  checkAuth: () => Promise.resolve(false),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Check backend connection and authentication on component mount
    checkBackendConnection()
      .then(connected => {
        if (connected) {
          checkAuth();
        } else {
          setConnectionError("Cannot connect to the backend server. Please ensure it's running on port 8000.");
          setLoading(false);
        }
      });
  }, []);

  const login = (token: string, username: string) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUsername', username);
    setIsAuthenticated(true);
    setUsername(username);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    setIsAuthenticated(false);
    setUsername(null);
    
    // Redirect to login page
    if (typeof window.navigateTo === 'function') {
      window.navigateTo('/admin/login');
    } else {
      window.location.href = '/admin/login';
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      const token = localStorage.getItem('adminToken');
      const storedUsername = localStorage.getItem('adminUsername');
      
      if (!token || !storedUsername) {
        setIsAuthenticated(false);
        setUsername(null);
        setLoading(false);
        return false;
      }
      
      // Verify token with backend
      try {
        const response = await fetchApi('/auth/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const userData = await response.json();
          setIsAuthenticated(true);
          setUsername(userData.username);
          setLoading(false);
          return true;
        } else {
          // Token is invalid or expired
          setIsAuthenticated(false);
          setUsername(null);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUsername');
          setLoading(false);
          return false;
        }
      } catch (error) {
        // Network error or server not available
          console.error('Could not verify token with server:', error);
          setConnectionError("Cannot connect to backend server. Please check if it's running.");
          
          // Allow offline usage with stored token in development environments
          // Since we don't have access to process.env, we'll use a simpler approach
          const isDevelopment = window.location.hostname === 'localhost';
          if (isDevelopment) {
            console.warn('DEV MODE: Allowing offline authentication with stored token');
            setIsAuthenticated(!!token);
            setUsername(storedUsername);
          } else {
            setIsAuthenticated(false);
          }
          
          setLoading(false);
          return !!token && isDevelopment;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUsername(null);
      setConnectionError("Authentication check failed due to an unexpected error.");
      setLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        loading,
        connectionError,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { isAuthenticated, loading } = useAuth();
    
    useEffect(() => {
      if (!loading && !isAuthenticated) {
        window.navigateTo('/admin/login');
      }
    }, [isAuthenticated, loading]);
    
    if (loading) {
      return <div>Loading...</div>; // Could be replaced with a proper loading component
    }
    
    if (!isAuthenticated) {
      return null; // Don't render anything while redirecting
    }
    
    return <Component {...props} />;
  };
};