/**
 * Registration token services for the admin dashboard
 */

import { fetchApi } from '../../config/api';
import { RegistrationToken } from '../../types/AdminTypes';
import { API_PATHS } from './ApiPaths';

/**
 * Fetch registration tokens
 */
export const fetchRegistrationTokens = async (): Promise<RegistrationToken[]> => {
  try {
    // Try the new endpoint first
    const response = await fetchApi<RegistrationToken[]>(API_PATHS.ADMIN.TOKENS);
    
    if (!response.success) {
      throw new Error(`Failed to fetch registration tokens: ${response.error || response.status}`);
    }
    
    return response.data || [];
  } catch (error) {
    console.error('Error fetching registration tokens:', error);
    return [];
  }
};

/**
 * Create a new registration token
 */
export const createRegistrationToken = async (description: string, expiryDays: number | null = null): Promise<RegistrationToken | null> => {
  try {
    const payload = {
      expires_days: expiryDays,
    };
    
    const response = await fetchApi<RegistrationToken>(API_PATHS.ADMIN.TOKENS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.success) {
      throw new Error(`Failed to create registration token: ${response.error || response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error creating registration token:', error);
    return null;
  }
};

/**
 * Delete a registration token
 */
export const deleteRegistrationToken = async (tokenId: string): Promise<boolean> => {
  try {
    const response = await fetchApi(`${API_PATHS.ADMIN.TOKENS}/${tokenId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(`Failed to delete registration token: ${response.error || response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting registration token:', error);
    return false;
  }
};

// Removed legacy aliases - use createRegistrationToken and deleteRegistrationToken directly