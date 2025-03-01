/**
 * API Configuration
 * 
 * This file configures the connection between the frontend and backend API.
 * It provides utilities for making API requests with consistent error handling.
 */

// Load environment variables or use defaults
// For production, these would be set in the build environment or runtime config
// For local development, we'll fall back to hardcoded defaults
const getApiBaseUrl = (): string => {
  // Check for environment variables (injected during build or runtime)
  if (typeof window !== 'undefined' && (window as any).__ENV && (window as any).__ENV.API_BASE_URL) {
    return (window as any).__ENV.API_BASE_URL;
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
  // Routes that require authentication:
  // - Admin routes
  // - Auth routes except login/register endpoints
  // - User routes
  // - Chat routes
  return (
    endpoint.startsWith('/admin') ||
    endpoint.startsWith('/auth/admin') ||
    endpoint.startsWith('/auth/users') || 
    endpoint.startsWith('/auth/apikeys') ||
    endpoint.startsWith('/auth/tokens') ||
    endpoint.startsWith('/user') ||
    endpoint.startsWith('/chat') ||
    endpoint.startsWith('/api/v1') // API gateway routes
  );
};

/**
 * Enhanced fetch function that automatically includes the API base URL
 * and provides better debugging information
 */
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
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
    const response = await fetch(url, {
      ...options,
      // Use our enhanced headers
      headers
    });
    
    // Log response status for debugging
    console.log(`Response from ${url}: ${response.status}`);
    
    // Handle 401 Unauthorized responses by clearing token
    if (response.status === 401 && isProtectedRoute(endpoint)) {
      console.warn('Authentication failed for protected route - clearing token');
      localStorage.removeItem('authToken');
      
      // If we're in the browser, redirect to login
      if (typeof window !== 'undefined' && window.navigateTo) {
        window.navigateTo('/login');
      }
    }
    
    // Parse JSON response if successful, otherwise throw error
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse JSON for all responses except those with no content
    if (response.status !== 204) {
      return await response.json();
    }
    
    return response;
  } catch (error) {
    console.error(`Network error when fetching ${url}:`, error);
    throw new Error(`Cannot connect to backend server at ${API_BASE_URL}. Please check if the server is running.`);
  }
};

/**
 * Helper function to check if the backend is available
 * Returns true if the backend is reachable, false otherwise
 */
export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetchApi('/health');
    if (response.ok) {
      console.log('Backend connection established successfully');
      return true;
    }
    console.warn('Backend responded but status indicates an issue:', response.status);
    return false;
  } catch (error) {
    console.error('Backend connection check failed:', error);
    return false;
  }
};