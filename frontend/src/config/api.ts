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
  
  // Use hardcoded default as fallback
  return 'http://localhost:8000';
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
    '/auth/register'
  ];
  
  // If this is a public auth endpoint, it doesn't need a token
  if (publicAuthEndpoints.includes(endpoint)) {
    return false;
  }
  
  // Routes that require authentication:
  // - Admin routes
  // - Auth routes except login/register endpoints
  // - User routes
  // - Chat routes
  return (
    endpoint.startsWith('/admin') ||
    endpoint.startsWith('/auth/') ||
    endpoint.startsWith('/user') ||
    endpoint.startsWith('/chat') ||
    endpoint.startsWith('/api/v1') // API gateway routes
  );
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
    const token = localStorage.getItem('authToken');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      console.log('Added authentication token for protected route');
    } else {
      console.warn('No auth token found for protected route:', endpoint);
    }
  }
  
  try {
    // Make the fetch request
    const response = await fetch(url, {
      ...options,
      // Use our enhanced headers
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
    if (response.status === 401 && isProtectedRoute(endpoint)) {
      console.warn('Authentication failed for protected route - clearing token');
      localStorage.removeItem('authToken');
      
      // Authentication redirects should be handled in the auth context component
      // rather than directly in the API utility
    }
    
    // For successful responses, parse JSON data
    if (response.ok) {
      if (response.status !== 204) {
        apiResponse.data = await response.json();
      }
    } else {
      // For errors, include error details
      try {
        const errorText = await response.text();
        try {
          // Try to parse error as JSON
          const errorJson = JSON.parse(errorText);
          apiResponse.error = errorJson.detail || errorText;
        } catch (jsonError) {
          // If not JSON, use as plain text
          apiResponse.error = errorText;
        }
        console.error(`API error (${response.status}): ${apiResponse.error}`);
      } catch (e) {
        apiResponse.error = `Error ${response.status}: ${response.statusText}`;
      }
    }
    
    return apiResponse;
  } catch (error) {
    // Network or other errors
    console.error(`Network error when fetching ${url}:`, error);
    
    return {
      success: false,
      status: 0, // 0 indicates network error
      data: null,
      error: `Cannot connect to backend server at ${API_BASE_URL}. Please check if the server is running.`
    };
  }
};

/**
 * Helper function to check if the backend is available
 * Returns true if the backend is reachable, false otherwise
 */
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
