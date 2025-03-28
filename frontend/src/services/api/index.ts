/**
 * API service adapter that uses the fetchApi utility
 */
import { fetchApi } from '../../config/api';

const api = {
  /**
   * GET request
   */
  get: async (url: string, options = {}) => {
    return await fetchApi(url, {
      method: 'GET',
      ...options
    });
  },
  
  /**
   * POST request
   */
  post: async (url: string, data?: any, options = {}) => {
    return await fetchApi(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  },
  
  /**
   * PUT request
   */
  put: async (url: string, data?: any, options = {}) => {
    return await fetchApi(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  },
  
  /**
   * DELETE request
   */
  delete: async (url: string, options = {}) => {
    return await fetchApi(url, {
      method: 'DELETE',
      ...options
    });
  }
};

export default api; 