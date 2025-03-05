/**
 * IP Whitelist management services for the admin dashboard
 */

import { fetchApi } from '../../config/api';
import { IPWhitelistEntry } from '../../types/AdminTypes';
import { API_PATHS } from './ApiPaths';

/**
 * Fetch IP whitelist entries
 */
export const fetchIPWhitelist = async (): Promise<IPWhitelistEntry[]> => {
  try {
    const response = await fetchApi<IPWhitelistEntry[]>(API_PATHS.ADMIN.IP_WHITELIST);
    
    if (!response.success) {
      throw new Error(`Failed to fetch IP whitelist: ${response.error || response.status}`);
    }
    
    // If is_active field doesn't exist, default to true
    const entries = (response.data || []).map(entry => {
      if (entry.is_active === undefined) {
        return {...entry, is_active: true};
      }
      return entry;
    });
    
    return entries;
  } catch (error) {
    console.error('Error fetching IP whitelist:', error);
    return [];
  }
};

/**
 * Get client IP address
 */
export const getClientIP = async (): Promise<string | null> => {
  try {
    const response = await fetchApi<{ ip: string }>(API_PATHS.ADMIN.CLIENT_IP);
    
    if (!response.success) {
      throw new Error(`Failed to get client IP: ${response.error || response.status}`);
    }
    
    return response.data?.ip || null;
  } catch (error) {
    console.error('Error getting client IP:', error);
    return null;
  }
};

/**
 * Add a new IP whitelist entry
 */
export const addIPWhitelistEntry = async (ipAddress: string): Promise<IPWhitelistEntry | null> => {
  try {
    const payload = {
      ip_address: ipAddress
    };
    
    const response = await fetchApi<IPWhitelistEntry>(API_PATHS.ADMIN.IP_WHITELIST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.success) {
      throw new Error(`Failed to add IP whitelist entry: ${response.error || response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error adding IP whitelist entry:', error);
    return null;
  }
};

/**
 * Delete an IP whitelist entry
 */
export const deleteIPWhitelistEntry = async (entryId: string): Promise<boolean> => {
  try {
    const response = await fetchApi(`${API_PATHS.ADMIN.IP_WHITELIST}/${entryId}`, {
      method: 'DELETE',
    });
    
    if (!response.success) {
      throw new Error(`Failed to delete IP whitelist entry: ${response.error || response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting IP whitelist entry:', error);
    return false;
  }
};