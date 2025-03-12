/**
 * API keys management services for the admin dashboard
 */

import { fetchApi } from '../../config/api';
import { ApiKey } from '../../types/AdminTypes';
import { API_PATHS } from './ApiPaths';

/**
 * Fetch API keys
 */
export const fetchApiKeys = async (): Promise<ApiKey[]> => {
  try {
    const response = await fetchApi<ApiKey[]>(API_PATHS.ADMIN.API_KEYS);
    
    if (!response.success) {
      throw new Error(`Failed to fetch API keys: ${response.error || response.status}`);
    }
    
    return response.data || [];
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }
};

/**
 * Create a new API key
 */
export const createApiKey = async (description: string, priority: number): Promise<ApiKey | null> => {
  try {
    const payload = {
      description,
      priority,
    };
    
    const response = await fetchApi<ApiKey>(API_PATHS.ADMIN.API_KEYS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.success) {
      throw new Error(`Failed to create API key: ${response.error || response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating API key:', error);
    return null;
  }
};

/**
 * Delete an API key
 */
export const deleteApiKey = async (keyId: number): Promise<boolean> => {
  try {
    const response = await fetchApi(`${API_PATHS.ADMIN.API_KEYS}/${keyId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(`Failed to delete API key: ${response.error || response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting API key:', error);
    return false;
  }
};