import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { fetchApi, checkBackendConnection } from '../config/api';

interface UserData {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  username: string | null;
  userEmail: string | null;
  loading: boolean;
  connectionError: string | null;
  login: (token: string, username: string, isAdmin: boolean) => void;
  adminLogin: (username: string, password: string) => Promise<boolean>;
  userLogin: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, token: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  userData: UserData | null;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  username: null,
  userEmail: null,
  loading: true,
  connectionError: null,
  login: () => {},
  adminLogin: () => Promise.resolve(false),
  userLogin: () => Promise.resolve(false),
  register: () => Promise.resolve(false),
  logout: () => {},
  checkAuth: () => Promise.resolve(false),
  userData: null,
});

declare global {
  interface Window {
    navigateTo?: (path: string) => void;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

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

  const login = (token: string, username: string, isAdmin: boolean) => {
    const tokenKey = isAdmin ? 'adminToken' : 'userToken';
    const usernameKey = isAdmin ? 'adminUsername' : 'username';
    
    localStorage.setItem(tokenKey, token);
    localStorage.setItem(usernameKey, username);
    localStorage.setItem('userRole', isAdmin ? 'admin' : 'user');
    
    setIsAuthenticated(true);
    setIsAdmin(isAdmin);
    setUsername(username);
  };

  const adminLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      // Use the standard OAuth2 password flow
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
      
      if (response.ok) {
        const data = await response.json();
        login(data.access_token, data.username, true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin login error:', error);
      return false;
    }
  };

  const userLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      // Use the standard OAuth2 password flow
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
      
      if (response.ok) {
        const data = await response.json();
        login(data.access_token, data.username, data.is_admin);
        return true;
      }
      return false;
    } catch (error) {
      console.error('User login error:', error);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string, token: string): Promise<boolean> => {
    try {
      const response = await fetchApi('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          email,
          password,
          token,
        }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    // Clear all auth-related localStorage items
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('userToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    
    // Reset auth state
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUsername(null);
    setUserEmail(null);
    setUserData(null);
    
    // Redirect based on previous role
    const redirectPath = isAdmin ? '/admin/login' : '/login';
    if (typeof window.navigateTo === 'function') {
      window.navigateTo(redirectPath);
    } else {
      window.location.href = redirectPath;
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    setLoading(true);
    setConnectionError(null);
    
    try {
      // Check if we have admin or user token
      const adminToken = localStorage.getItem('adminToken');
      const userToken = localStorage.getItem('userToken');
      const userRole = localStorage.getItem('userRole');
      
      // Determine which token to use
      const token = adminToken || userToken;
      const storedUsername = localStorage.getItem(adminToken ? 'adminUsername' : 'username');
      const isAdminRole = userRole === 'admin';
      
      if (!token || !storedUsername) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUsername(null);
        setUserData(null);
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
          setIsAdmin(userData.is_admin);
          setUsername(userData.username);
          setUserEmail(userData.email);
          setUserData(userData);
          setLoading(false);
          return true;
        } else {
          // Token is invalid or expired
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUsername(null);
          setUserData(null);
          
          // Clear stored tokens
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUsername');
          localStorage.removeItem('userToken');
          localStorage.removeItem('username');
          localStorage.removeItem('userRole');
          
          setLoading(false);
          return false;
        }
      } catch (error) {
        // Network error or server not available
        console.error('Could not verify token with server:', error);
        setConnectionError("Cannot connect to backend server. Please check if it's running.");
        
        // Allow offline usage with stored token in development environments
        const isDevelopment = window.location.hostname === 'localhost';
        if (isDevelopment) {
          console.warn('DEV MODE: Allowing offline authentication with stored token');
          setIsAuthenticated(!!token);
          setIsAdmin(isAdminRole);
          setUsername(storedUsername);
        } else {
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
        
        setLoading(false);
        return !!token && isDevelopment;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUsername(null);
      setUserData(null);
      setConnectionError("Authentication check failed due to an unexpected error.");
      setLoading(false);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        username,
        userEmail,
        loading,
        connectionError,
        login,
        adminLogin,
        userLogin,
        register,
        logout,
        checkAuth,
        userData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Higher-order component for protected routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requireAdmin: boolean = false
) => {
  return (props: P) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();
    
    useEffect(() => {
      if (!loading && !isAuthenticated) {
        // Redirect to appropriate login page
        window.navigateTo(requireAdmin ? '/admin/login' : '/login');
      } else if (!loading && requireAdmin && !isAdmin) {
        // If admin access is required but user is not admin
        window.navigateTo('/unauthorized');
      }
    }, [isAuthenticated, isAdmin, loading]);
    
    if (loading) {
      return <div>Loading...</div>; // Could be replaced with a proper loading component
    }
    
    if (!isAuthenticated || (requireAdmin && !isAdmin)) {
      return null; // Don't render anything while redirecting
    }
    
    return <Component {...props} />;
  };
};