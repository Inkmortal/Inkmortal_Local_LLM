/**
 * System stats API services for the admin dashboard
 */

import { fetchApi } from '../../config/api';
import { SystemStats } from '../../types/AdminTypes';
import { API_PATHS } from './ApiPaths';

/**
 * Fetch system stats
 */
export const fetchSystemStats = async (): Promise<SystemStats | null> => {
  try {
    const response = await fetchApi<SystemStats>(API_PATHS.ADMIN.SYSTEM_STATS);
    
    if (!response.success) {
      throw new Error(`Failed to fetch system stats: ${response.error || response.status}`);
    }
    
    // If queue_connected is undefined, assume it's connected
    if (response.data && response.data.queue_connected === undefined) {
      response.data.queue_connected = true;
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return null;
  }
};

/**
 * Fetch usage stats
 */
export const fetchUsageStats = async (): Promise<any | null> => {
  try {
    const response = await fetchApi(API_PATHS.ADMIN.USAGE_STATS);
    
    if (!response.success) {
      throw new Error(`Failed to fetch usage stats: ${response.error || response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return null;
  }
};