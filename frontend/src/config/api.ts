/**
 * API Configuration
 * 
 * This file configures the connection between the frontend and backend API.
 * It provides utilities for making API requests with consistent error handling.
 */

// Base URL for all API requests
export const API_BASE_URL = 'http://localhost:8000';

/**
 * Enhanced fetch function that automatically includes the API base URL
 * and provides better debugging information
 */
export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`Fetching from: ${url}`, options);
  
  try {
    const response = await fetch(url, options);
    
    // Log response status for debugging
    console.log(`Response from ${url}: ${response.status}`);
    
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