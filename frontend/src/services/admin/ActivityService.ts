/**
 * Activity logging services for the admin dashboard
 */

import { Activity } from '../../types/AdminTypes';
import { fetchApi } from '../../config/api';
import { API_PATHS } from './ApiPaths';

/**
 * Fetch recent activity logs from the server
 * @param limit Optional number of items to retrieve (default 10)
 * @returns List of activities
 */
export const fetchActivities = async (limit = 10): Promise<Activity[]> => {
  const response = await fetchApi<any[]>(`${API_PATHS.ADMIN.ACTIVITIES}?limit=${limit}`);
  
  if (!response.success || !response.data) {
    console.error('Failed to fetch activities:', response.error);
    return [];
  }
  
  // Transform the backend data to match the frontend Activity interface
  return response.data.map(item => {
    // Format the timestamp relative to current time (e.g., "5 minutes ago")
    const timeFormatted = formatRelativeTime(new Date(item.time));
    
    return {
      id: item.id,
      user: item.user,
      action: item.action,
      target: item.target,
      time: timeFormatted,
      // Map backend resource_type to frontend type
      type: mapResourceTypeToActivityType(item.type)
    };
  });
};

/**
 * Map backend resource_type to frontend activity type
 */
function mapResourceTypeToActivityType(resourceType: string): 'api-key' | 'ip' | 'token' | 'queue' {
  const typeMap: Record<string, 'api-key' | 'ip' | 'token' | 'queue'> = {
    'api-key': 'api-key',
    'ip': 'ip',
    'token': 'token',
    'queue': 'queue',
    'registration-token': 'token',
    'ip-whitelist': 'ip'
  };
  
  return typeMap[resourceType] || 'api-key';
}

/**
 * Format a date relative to the current time
 * @param date Date to format
 * @returns Formatted string (e.g., "5 minutes ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDay < 30) {
    return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  } else {
    // For older dates, return the formatted date
    return date.toLocaleDateString();
  }
}