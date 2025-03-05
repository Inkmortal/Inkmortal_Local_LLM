/**
 * User management API services for the admin dashboard
 */

import { fetchApi } from '../../config/api';
import { User } from '../../types/AdminTypes';
import { API_PATHS } from './ApiPaths';

/**
 * Fetch users
 */
export const fetchUsers = async (): Promise<User[]> => {
  try {
    // Try the new endpoint first
    const response = await fetchApi<User[]>(API_PATHS.ADMIN.USERS);
    
    if (!response.success) {
      console.warn(`Failed to fetch users from primary endpoint: ${response.error || response.status}`);
      
      // Try the legacy endpoint as fallback
      const legacyResponse = await fetchApi<User[]>(API_PATHS.ADMIN_AUTH.USERS);
      
      if (!legacyResponse.success) {
        throw new Error(`Failed to fetch users: ${legacyResponse.error || legacyResponse.status}`);
      }
      
      return legacyResponse.data || [];
    }
    
    return response.data || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

/**
 * Delete a user
 */
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    // Try the new endpoint first
    let response = await fetchApi(`${API_PATHS.ADMIN.USERS}/${userId}`, {
      method: 'DELETE',
    });
    
    // If it doesn't work, try the legacy endpoint
    if (!response.success) {
      console.warn(`Failed to delete user with primary endpoint: ${response.error || response.status}`);
      
      response = await fetchApi(`${API_PATHS.ADMIN_AUTH.USERS}/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.success) {
        throw new Error(`Failed to delete user: ${response.error || response.status}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
};