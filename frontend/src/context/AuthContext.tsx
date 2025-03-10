import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchApi, ApiResponse } from '../config/api';

// Configure authentication parameters
const AUTH_EXPIRY_DAYS = 14;
const AUTH_CHECK_THROTTLE_MS = 2000;
const TOKEN_REFRESH_BUFFER_MS = 60 * 60 * 1000; // Refresh token 1 hour before expiry

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

// Check if we're in a production environment
const isProduction = window.location.protocol === 'https:';

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
  // Create expiration time (14 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AUTH_EXPIRY_DAYS);
  
  // Store token with expiration in localStorage
  const tokenData: AuthData = {
    token,
    expiresAt: expiresAt.toISOString(),
    username,
    isAdmin
  };
  
  // Store token data in localStorage (used for API calls)
  localStorage.setItem('authToken', token);
  localStorage.setItem('authData', JSON.stringify(tokenData));
  
  // Calculate cookie expiry to match token expiry (in seconds)
  const cookieExpirySeconds = AUTH_EXPIRY_DAYS * 24 * 60 * 60;
  
  // Create a persistent cookie for auth detection across tabs
  // We store auth state, not the actual token (for security)
  document.cookie = `auth_state=${btoa(JSON.stringify({
    username,
    isAdmin,
    timestamp: Date.now()
  }))}; path=/; max-age=${cookieExpirySeconds}; SameSite=Lax; ${isProduction ? 'secure' : ''}`;
  
  // Broadcast login to other tabs if BroadcastChannel is supported
  if (authChannel) {
    authChannel.postMessage({ type: 'login', username, isAdmin });
  }
};

const removeToken = (): void => {
  // Clear localStorage
  localStorage.removeItem('authToken');
  localStorage.removeItem('authData');
  
  // Clear auth cookie - when cookie is gone, all tabs know auth is gone
  document.cookie = `auth_state=; path=/; max-age=0; SameSite=Lax; ${isProduction ? 'secure' : ''}`;
  
  // Broadcast logout to other tabs
  if (authChannel) {
    authChannel.postMessage({ type: 'logout' });
  }
};

// Check for authentication in cookies (cross-tab support)
const checkCookieAuth = (): { username: string; isAdmin: boolean; timestamp: number } | null => {
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_state='));
  
  if (!authCookie) return null;
  
  try {
    const authStateStr = authCookie.split('=')[1].trim();
    const authState = JSON.parse(atob(authStateStr));
    
    // Validate the data
    if (authState && 
        authState.username && 
        typeof authState.isAdmin === 'boolean' &&
        typeof authState.timestamp === 'number') {
      return {
        username: authState.username,
        isAdmin: authState.isAdmin,
        timestamp: authState.timestamp
      };
    }
  } catch (e) {
    console.error('Error parsing auth cookie:', e);
  }
  
  return null;
};

// Check if token is close to expiry and needs refresh
const isTokenNearExpiry = (expiryDateStr: string): boolean => {
  const expiryDate = new Date(expiryDateStr);
  const now = new Date();
  
  // Calculate time until expiry in ms
  const timeUntilExpiry = expiryDate.getTime() - now.getTime();
  
  // Return true if token will expire within buffer period
  return timeUntilExpiry <= TOKEN_REFRESH_BUFFER_MS;
};

const getAuthData = (): AuthData | null => {
  try {
    // First check localStorage
    const tokenData = localStorage.getItem('authData');
    if (tokenData) {
      const data: AuthData = JSON.parse(tokenData);
      
      // Check if token is expired
      const expiresAt = new Date(data.expiresAt);
      if (expiresAt < new Date()) {
        // Token expired, clean up
        removeToken();
        return null;
      }
      
      return data;
    }
    
    // If no localStorage data but cookie exists, try to recover
    const cookieAuth = checkCookieAuth();
    if (cookieAuth) {
      // We have cookie auth but no localStorage - this could happen if localStorage was cleared
      // We can't recover the token, but we can detect the session is active in another tab
      console.log('Found cookie auth but no localStorage data - will attempt recovery');
      return null;
    }
    
    return null;
  } catch (e) {
    // In case of any parsing errors, clean up and return null
    console.error('Error parsing auth data:', e);
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
  const tokenRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authSyncAttemptRef = useRef(0);
  
  // For token refresh
  const scheduleTokenRefresh = (expiresAt: string) => {
    // Clear any existing refresh timeout
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }
    
    const expiryDate = new Date(expiresAt).getTime();
    const now = Date.now();
    const timeUntilRefresh = Math.max(0, expiryDate - now - TOKEN_REFRESH_BUFFER_MS);
    
    console.log(`Scheduling token refresh in ${Math.floor(timeUntilRefresh / 1000 / 60)} minutes`);
    
    tokenRefreshTimeoutRef.current = setTimeout(async () => {
      // Only refresh if still authenticated
      if (isAuthenticated) {
        console.log('Token refresh triggered');
        await checkAuth(true); // Force refresh
      }
    }, timeUntilRefresh);
  };
  
  // Clear any auth-related errors
  const clearErrors = () => {
    setConnectionError(null);
  };
  
  // Check localStorage and cookie consistency
  const checkStorageConsistency = () => {
    const authData = getAuthData();
    const cookieAuth = checkCookieAuth();
    
    // Both exist and match
    if (authData && cookieAuth && authData.username === cookieAuth.username) {
      return true;
    }
    
    // Both don't exist (logged out)
    if (!authData && !cookieAuth) {
      return true;
    }
    
    // Inconsistent state
    return false;
  };
  
  // Recovery function for when localStorage is cleared but cookie exists
  const attemptAuthRecovery = async () => {
    const cookieAuth = checkCookieAuth();
    if (!cookieAuth) return false;
    
    // Increment attempt counter
    authSyncAttemptRef.current += 1;
    
    // Limit attempts to prevent infinite loops
    if (authSyncAttemptRef.current > 2) {
      console.warn('Too many auth recovery attempts, giving up');
      removeToken(); // Clear everything to prevent further attempts
      return false;
    }
    
    console.log('Attempting auth recovery from cookie data');
    
    try {
      // Use the standardized endpoint to verify auth
      const response = await fetchApi<{
        username: string;
        email: string;
        is_admin: boolean;
        access_token?: string;
      }>('/auth/me', {
        method: 'GET',
      });
      
      if (response.success && response.data) {
        // We have valid auth, update localStorage with fresh data
        const userData = response.data;
        
        // If backend included a refreshed token, use it
        const token = response.data.access_token || localStorage.getItem('authToken');
        
        if (token) {
          // Store updated user data with a fresh expiration
          saveToken(token, userData.username, userData.is_admin);
          
          // Update user information in state
          setUsername(userData.username);
          setUserEmail(userData.email);
          setIsAdmin(userData.is_admin);
          setUserData(userData);
          setConnectionError(null);
          setIsAuthenticated(true);
          console.log('Successfully recovered auth from cookie');
          return true;
        }
      }
      
      // If recovery failed, clear everything to prevent partial state
      removeToken();
      return false;
    } catch (error) {
      console.error('Auth recovery error:', error);
      return false;
    }
  };
  
  // Handle tab visibility changes to sync auth state
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // When tab becomes visible, check cookies for possible auth changes in other tabs
        const cookieAuth = checkCookieAuth();
        
        // If we're not authenticated but cookie shows we should be
        if (cookieAuth && !isAuthenticated) {
          console.log('Detected authentication from another tab');
          
          // Set basic auth state from cookie
          setIsAuthenticated(true);
          setIsAdmin(cookieAuth.isAdmin);
          setUsername(cookieAuth.username);
          
          // Fetch full user data
          checkAuth();
        }
        // If we're authenticated but cookie is gone (logout in another tab)
        else if (!cookieAuth && isAuthenticated) {
          console.log('Detected logout from another tab');
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUsername(null);
          setUserEmail(null);
          setUserData(null);
          navigate('/login');
        }
        // If auth state seems inconsistent
        else if (!checkStorageConsistency()) {
          console.log('Detected inconsistent auth state, attempting recovery');
          await attemptAuthRecovery();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, navigate]);
  
  // Listen for auth events from other tabs (backup for browsers without cookie support)
  useEffect(() => {
    if (!authChannel) return;
    
    const handleAuthEvent = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      
      if (data.type === 'login') {
        setIsAuthenticated(true);
        setIsAdmin(!!data.isAdmin);
        setUsername(data.username || null);
        setLoading(false);
      } else if (data.type === 'logout') {
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
  
  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    };
  }, []);
  
  // Initialize authentication state on load
  useEffect(() => {
    // Reset auth sync attempt counter
    authSyncAttemptRef.current = 0;
    
    // Try to get stored auth data first
    const authData = getAuthData();
    
    // Also check cookie auth (for cross-tab support)
    const cookieAuth = checkCookieAuth();
    
    // If we have localStorage token data
    if (authData) {
      // Set authenticated state from localStorage
      setIsAuthenticated(true);
      setIsAdmin(authData.isAdmin);
      setUsername(authData.username);
      
      // Schedule token refresh if needed
      if (isTokenNearExpiry(authData.expiresAt)) {
        console.log('Token near expiry, will refresh soon');
      } else {
        scheduleTokenRefresh(authData.expiresAt);
      }
      
      // Verify with backend
      checkAuth().then((isValid) => {
        setLoading(false);
        
        if (!isValid) {
          // Token invalid - redirect to login for protected routes
          const currentPath = location.pathname;
          
          if (currentPath.startsWith('/admin') || 
              currentPath.startsWith('/chat') || 
              currentPath.startsWith('/user')) {
            navigate('/login', { state: { from: currentPath } });
          }
        }
      });
    } 
    // If we don't have localStorage data but have cookie auth
    else if (cookieAuth) {
      // We have cookie auth but no localStorage - this happens when localStorage is cleared
      // We're still considered authenticated but need to re-fetch user data
      setIsAuthenticated(true);
      setIsAdmin(cookieAuth.isAdmin);
      setUsername(cookieAuth.username);
      
      // Attempt recovery
      attemptAuthRecovery().then((recovered) => {
        setLoading(false);
        
        if (!recovered) {
          // If recovery fails, clear everything
          removeToken();
          navigate('/login');
        }
      });
    }
    // No auth data at all
    else {
      // Not authenticated
      setLoading(false);
    }
  }, [navigate, location]);
  
  // Logout handler
  const logout = () => {
    // Clear any token refresh timeout
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
      tokenRefreshTimeoutRef.current = null;
    }
    
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
    
    // Create expiration time (14 days from now) for token refresh scheduling
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + AUTH_EXPIRY_DAYS);
    scheduleTokenRefresh(expiresAt.toISOString());
    
    console.log(`Logged in as ${username}`, isAdmin ? '(Admin)' : '');
  };
  
  // Check if token is still valid, optionally force a token refresh
  const checkAuth = async (forceRefresh: boolean = false): Promise<boolean> => {
    // Check if token exists first before making the API call
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found in checkAuth, returning false without API call');
      return false;
    }
    
    // Prevent duplicate auth checks unless forcing a refresh
    if (authCheckInProgressRef.current && !forceRefresh) {
      console.log('Auth check already in progress, skipping duplicate call');
      return isAuthenticated; // Return current state
    }
    
    // Throttle auth checks to prevent too many requests, unless forcing a refresh
    const now = Date.now();
    if (!forceRefresh && now - lastAuthCheckTimeRef.current < AUTH_CHECK_THROTTLE_MS) {
      console.log('Auth check throttled (within throttle period of previous check)');
      return isAuthenticated; // Return current state
    }
    
    // Mark check as in progress and update last check time
    authCheckInProgressRef.current = true;
    lastAuthCheckTimeRef.current = now;
    
    try {
      console.log(`Verifying auth token with backend ${forceRefresh ? '(forced refresh)' : ''}`);
      
      // Use the standardized endpoint for current user info
      const response = await fetchApi<{
        username: string;
        email: string;
        is_admin: boolean;
        access_token?: string; // Optional refreshed token
      }>('/auth/me', {
        method: 'GET',
        headers: forceRefresh ? { 'X-Refresh-Token': 'true' } : undefined,
      });
      
      if (response.success && response.data) {
        // Token is valid, update auth data with fresh data from backend
        const userData = response.data;
        
        // Use refreshed token if provided
        const newToken = userData.access_token || token;
        
        // Store updated user data with a fresh expiration
        saveToken(newToken, userData.username, userData.is_admin);
        
        // Schedule token refresh
        const authData = getAuthData();
        if (authData) {
          scheduleTokenRefresh(authData.expiresAt);
        }
        
        // Update user information in state
        setUsername(userData.username);
        setUserEmail(userData.email);
        setIsAdmin(userData.is_admin);
        setUserData(userData);
        setConnectionError(null);
        
        // Ensure authenticated state is set
        if (!isAuthenticated) {
          setIsAuthenticated(true);
        }
        
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
    } finally {
      authCheckInProgressRef.current = false;
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
  const { isAuthenticated, loading, checkAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastPathRef = useRef(location.pathname);
  
  // Verify auth on route change for protected routes
  useEffect(() => {
    // Only check auth when the path actually changes
    if (isAuthenticated && !loading && location.pathname !== lastPathRef.current) {
      lastPathRef.current = location.pathname;
      checkAuth();
    }
  }, [location.pathname, isAuthenticated, loading, checkAuth]);
  
  // Redirect to login if not authenticated
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