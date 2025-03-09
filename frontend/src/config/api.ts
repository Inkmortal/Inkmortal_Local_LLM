/**
 * API Configuration
 * 
 * This file configures the connection between the frontend and backend API.
 * It provides utilities for making API requests with consistent error handling.
 */

// Load environment variables or use defaults
// For production, these would be set in the build environment or runtime config
// For local development, we'll fall back to hardcoded defaults
// Define the expected window environment variables
interface WindowEnv {
  __ENV?: {
    API_BASE_URL?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const getApiBaseUrl = (): string => {
  // Check for environment variables (injected during build or runtime)
  if (typeof window !== 'undefined') {
    const windowWithEnv = window as WindowEnv;
    if (windowWithEnv.__ENV?.API_BASE_URL) {
      return windowWithEnv.__ENV.API_BASE_URL;
    }
  }
  
  // Use hardcoded default as fallback - ensure it matches your backend
  return 'http://127.0.0.1:8000';
};

// Base URL for all API requests
export const API_BASE_URL = getApiBaseUrl();

/**
 * Determines if a route requires authentication
 */
const isProtectedRoute = (endpoint: string): boolean => {
  // Auth endpoints that DON'T require authentication
  const publicAuthEndpoints = [
    '/auth/login',
    '/auth/admin/login',
    '/auth/register',
    '/auth/token',  // Add token endpoint explicitly
    '/auth/admin/setup-status',
    '/auth/admin/fetch-setup-token',
    '/auth/admin/setup',
    '/auth/me'
  ];
  
  // If this is a public auth endpoint, it doesn't need a token
  if (publicAuthEndpoints.includes(endpoint)) {
    return false;
  }
  
  // Routes that require authentication:
  // - Admin routes
  // - Auth routes except login/register endpoints
  // - User routes
  // - Chat routes (both direct and API endpoints)
  // - API gateway routes
  // Special handling for admin setup endpoints which should ALWAYS be public
  const adminSetupEndpoints = [
    '/auth/admin/setup-status',
    '/auth/admin/fetch-setup-token',
    '/auth/admin/setup'
  ];
  
  if (adminSetupEndpoints.includes(endpoint)) {
    console.log(`Access to public admin setup endpoint: ${endpoint}`);
    return false; 
  }

  return (
    endpoint.startsWith('/admin') ||
    endpoint.startsWith('/auth/') ||
    endpoint.startsWith('/user') ||
    endpoint.startsWith('/chat') ||
    endpoint.startsWith('/api/chat') || // API chat routes
    endpoint.startsWith('/api/v1') // API gateway routes
  );
};

// Get auth token from storage with enhanced functionality
const getAuthToken = (): string | null => {
  try {
    const authDataStr = localStorage.getItem('authData');
    if (authDataStr) {
      const authData = JSON.parse(authDataStr);
      // Check for token expiration
      const expiresAt = new Date(authData.expiresAt);
      if (expiresAt > new Date()) {
        return authData.token;
      } else {
        console.warn('Token expired, removing from storage');
        // Token expired, clean up and broadcast logout
        localStorage.removeItem('authData');
        localStorage.removeItem('authToken');
        document.cookie = 'auth_session=; path=/; max-age=0; SameSite=Lax; secure';
        try {
          const authChannel = new BroadcastChannel('auth_channel');
          authChannel.postMessage({ type: 'logout' });
          authChannel.close();
        } catch (e) {
          console.warn('BroadcastChannel not supported');
        }
        return null;
      }
    }
    
    // Fallback to legacy token
    const legacyToken = localStorage.getItem('authToken');
    if (legacyToken) {
      console.warn('Using legacy token format without expiration data');
    }
    return legacyToken;
  } catch (e) {
    console.error('Error parsing auth data:', e);
    // Clean up storage when JSON parsing fails
    localStorage.removeItem('authData');
    return localStorage.getItem('authToken');
  }
};


/**
 * Standard response structure for all API calls
 * Provides a consistent way to handle both success and error responses
 */
export interface ApiResponse<T> {
  success: boolean;     // Whether the request was successful
  status: number;       // HTTP status code
  data: T | null;       // Response data (null for errors)
  error?: string;       // Error message (if any)
}

// Create a reusable retrying fetch with exponential backoff
const fetchWithRetry = async (url: string, options: RequestInit, retries = 2, backoff = 1000): Promise<Response> => {
  try {
    // Use AbortController for timeout with proper error handling
    const controller = new AbortController();
    const timeoutMs = 30000; // 30 seconds
    
    // Only add the abort signal if it's not a streaming request
    const isStreaming = url.includes('/streaming') || url.includes('/sse');
    const fetchOptions = {
      ...options,
      headers: options.headers,
      // Don't use AbortController for streaming endpoints
      signal: isStreaming ? undefined : controller.signal,
      // Prevent browser caching
      cache: 'no-store' as RequestCache
    };
    
    // Set up the timeout
    const timeoutId = setTimeout(() => {
      console.log(`Request to ${url} timed out after ${timeoutMs}ms, aborting`);
      controller.abort();
    }, timeoutMs);
    
    // Execute the fetch
    const response = await fetch(url, fetchOptions);
    
    // Clear the timeout since we got a response
    clearTimeout(timeoutId);
    
    return response;
  } catch (error) {
    if (retries === 0) throw error;
    
    // Check if it's a network error (not an abort)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.log(`Network error fetching ${url}, retrying in ${backoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    
    // Re-throw abort errors or other errors
    throw error;
  }
};

/**
 * Enhanced fetch function that automatically includes the API base URL
 * and provides better debugging information with a standardized response format
 */
export const fetchApi = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`Fetching from: ${url}`);
  
  // Create a new headers object from the existing headers (if any)
  const headers = new Headers(options.headers || {});
  
  // Add default Content-Type if not provided
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add authentication token for protected routes
  if (isProtectedRoute(endpoint)) {
    const token = getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log('Added authentication token for protected route');
    } else {
      console.warn('No auth token found for protected route:', endpoint);
      
      // Return early with auth error for protected routes, EXCEPT:
      // 1. Auth token endpoint - needed for login
      // 2. Register endpoint - needed for registration 
      // 3. Login endpoint - obviously needed for login
      // For all other protected routes, we should fail early rather than make the API call
      // Fix login issue: must normalize path format by ensuring all have leading slash
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
      if (!normalizedEndpoint.includes('/auth/token') && 
          !normalizedEndpoint.includes('/auth/register') && 
          !normalizedEndpoint.includes('/auth/login') &&
          !normalizedEndpoint.includes('/auth/admin/login')) {
        console.error('Authentication required for protected route:', endpoint);
        return {
          success: false,
          status: 401,
          data: null,
          error: 'Authentication required. Please log in.'
        };
      }
    }
  }
  
  try {
    // Use our fetchWithRetry that includes timeout and retry logic
    const response = await fetchWithRetry(url, {
      ...options,
      headers
    });
    
    // Log response status for debugging
    console.log(`Response from ${url}: ${response.status}`);
    
    // Initialize our standard response structure
    const apiResponse: ApiResponse<T> = {
      success: response.ok,
      status: response.status,
      data: null
    };
    
    // Handle 401 Unauthorized responses by clearing token
    if (response.status === 401) {
      // Special handling for admin setup endpoints
      if (
        endpoint === '/auth/admin/setup-status' ||
        endpoint === '/auth/admin/fetch-setup-token' ||
        endpoint === '/auth/admin/setup'
      ) {
        console.error(`Authentication error for admin setup endpoint: ${endpoint}`);
        console.error('This should never happen as these are public endpoints');
      } 
      // Regular handling for protected routes
      else if (isProtectedRoute(endpoint)) {
        console.warn('Authentication failed for protected route - clearing token');
        // Clear both auth storages
        localStorage.removeItem('authToken');
        localStorage.removeItem('authData');
        document.cookie = 'auth_session=; path=/; max-age=0; SameSite=Lax; secure';
        
        // Broadcast logout to other tabs
        try {
          const authChannel = new BroadcastChannel('auth_channel');
          authChannel.postMessage({ type: 'logout' });
          authChannel.close();
        } catch (e) {
          console.warn('BroadcastChannel not supported');
        }
        
        // Authentication redirects should be handled in the auth context component
        // rather than directly in the API utility
      }
    }
    
    // For all responses, try to parse JSON data
    try {
      // Only attempt to parse if there's actual content
      if (response.status !== 204 && response.headers.get('content-length') !== '0') {
        const responseText = await response.text();
        if (responseText) {
          try {
            apiResponse.data = JSON.parse(responseText);
          } catch (jsonError) {
            console.warn('Response was not valid JSON, using as text:', responseText);
            apiResponse.data = responseText as unknown as T;
          }
        }
      }
      
      // For error responses, set error message from response data
      if (!response.ok) {
        if (apiResponse.data && typeof apiResponse.data === 'object' && (apiResponse.data as any).detail) {
          apiResponse.error = (apiResponse.data as any).detail;
        } else if (apiResponse.data && typeof apiResponse.data === 'string') {
          apiResponse.error = apiResponse.data;
        } else {
          apiResponse.error = `Error ${response.status}: ${response.statusText}`;
        }
        console.error(`API error (${response.status}): ${apiResponse.error}`);
      }
    } catch (e) {
      console.error('Error processing response:', e);
      apiResponse.error = `Error ${response.status}: ${response.statusText}`;
    }
    
    return apiResponse;
  } catch (error) {
    // Network or other errors
    let errorMessage = "Failed to connect to backend server";
    
    // Check if this was an abort error (timeout)
    if (error instanceof DOMException && error.name === 'AbortError') {
      errorMessage = "Request timed out. The server is taking too long to respond.";
    } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      errorMessage = "Cannot connect to the backend server. Please check if the server is running at " + API_BASE_URL;
    } else {
      errorMessage = `Network error: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    console.error(`Network error when fetching ${url}:`, error);
    
    return {
      success: false,
      status: 0, // 0 indicates network error
      data: null,
      error: errorMessage
    };
  }
};

/**
 * Specialized fetch function for admin setup endpoints that should never require authentication
 * This function bypasses all authentication checks
 */
export const fetchAdminSetup = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  // Validate that this is only used for admin setup endpoints
  const validEndpoints = [
    '/auth/admin/setup-status',
    '/auth/admin/fetch-setup-token',
    '/auth/admin/setup'
  ];
  
  if (!validEndpoints.includes(endpoint)) {
    console.error(`fetchAdminSetup should only be used with admin setup endpoints, got: ${endpoint}`);
    return {
      success: false,
      status: 400,
      data: null,
      error: 'Invalid use of fetchAdminSetup function'
    };
  }
  
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`Admin setup fetch from: ${url} (no auth)`);
  
  // Create headers without authentication
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  try {
    // Make the fetch request with no auth
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    console.log(`Admin setup response from ${url}: ${response.status}`);
    
    // Initialize response structure
    const apiResponse: ApiResponse<T> = {
      success: response.ok,
      status: response.status,
      data: null
    };
    
    // Process response body
    try {
      if (response.status !== 204 && response.headers.get('content-length') !== '0') {
        const responseText = await response.text();
        if (responseText) {
          try {
            apiResponse.data = JSON.parse(responseText);
          } catch (jsonError) {
            apiResponse.data = responseText as unknown as T;
          }
        }
      }
      
      if (!response.ok) {
        if (apiResponse.data && typeof apiResponse.data === 'object' && (apiResponse.data as any).detail) {
          apiResponse.error = (apiResponse.data as any).detail;
        } else if (apiResponse.data && typeof apiResponse.data === 'string') {
          apiResponse.error = apiResponse.data;
        } else {
          apiResponse.error = `Error ${response.status}: ${response.statusText}`;
        }
        console.error(`Admin setup API error (${response.status}): ${apiResponse.error}`);
      }
    } catch (e) {
      console.error('Error processing admin setup response:', e);
      apiResponse.error = `Error ${response.status}: ${response.statusText}`;
    }
    
    return apiResponse;
  } catch (error) {
    console.error(`Network error in admin setup fetch ${url}:`, error);
    return {
      success: false,
      status: 0,
      data: null,
      error: `Cannot connect to backend server at ${API_BASE_URL}`
    };
  }
};

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    // First check if the health endpoint exists
    const response = await fetchApi('/health');
    if (response.success) {
      console.log('Backend connection established successfully');
      return true;
    }
    
    // Fallback to another endpoint if health check endpoint doesn't exist
    if (response.status === 404) {
      // Try the root endpoint as fallback
      const rootResponse = await fetchApi('');
      if (rootResponse.status !== 0) { // Any response except network error
        console.log('Backend connection established via root endpoint');
        return true;
      }
    }
    
    console.warn('Backend responded but status indicates an issue:', response.status);
    return false;
  } catch (error) {
    console.error('Backend connection check failed:', error);
    return false;
  }
};