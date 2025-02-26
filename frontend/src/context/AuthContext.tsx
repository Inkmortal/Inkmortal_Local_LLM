import React, { createContext, useState, useEffect, useContext } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  loading: boolean;
  login: (token: string, username: string) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  username: null,
  loading: true,
  login: () => {},
  logout: () => {},
  checkAuth: () => Promise.resolve(false),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check authentication on component mount
    checkAuth();
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
    window.navigateTo('/admin/login');
  };

  const checkAuth = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const storedUsername = localStorage.getItem('adminUsername');
      
      if (!token || !storedUsername) {
        setIsAuthenticated(false);
        setUsername(null);
        setLoading(false);
        return false;
      }
      
      // Verify token with backend (this is a mock implementation)
      // In a real implementation, you would make an API call to verify the token
      // const response = await fetch('/api/auth/verify', {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      // const isValid = response.ok;
      
      // For now, just check if token exists
      const isValid = !!token;
      
      setIsAuthenticated(isValid);
      setUsername(isValid ? storedUsername : null);
      setLoading(false);
      return isValid;
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUsername(null);
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