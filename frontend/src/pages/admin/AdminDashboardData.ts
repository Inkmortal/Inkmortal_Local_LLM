/**
 * AdminDashboardData.ts
 * 
 * This file provides functions to fetch admin dashboard data from the backend API.
 */

import { fetchApi } from '../../config/api';

// Interface for dashboard card data
export interface DashboardCard {
  id: string;
  title: string;
  count: number;
  active?: number;
  processing?: number;
  path: string;
}

// Interface for system stats data
export interface SystemStats {
  cpu: number;
  memory: number;
  storage: number;
  uptime: string;
  ollama: {
    status: string;
    model: string;
    version: string;
  }
}

// Interface for activity data
export interface Activity {
  id: number;
  type: string;
  action: string;
  user: string;
  target: string;
  time: string;
}

// Interface for complete dashboard data
export interface DashboardData {
  dashboard_cards: DashboardCard[];
  system_stats: SystemStats;
  recent_activities: Activity[];
}

/**
 * Fetch all dashboard data from the API
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetchApi('/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    
    // Return mock data as fallback (useful during development)
    return {
      dashboard_cards: [
        {
          id: 'ip-whitelist',
          title: 'IP Whitelist',
          count: 0,
          path: '/admin/ip-whitelist'
        },
        {
          id: 'tokens',
          title: 'Registration Tokens',
          count: 0,
          active: 0,
          path: '/admin/tokens'
        },
        {
          id: 'api-keys',
          title: 'API Keys',
          count: 0,
          path: '/admin/api-keys'
        },
        {
          id: 'queue',
          title: 'Queue Monitor',
          count: 0,
          processing: 0,
          path: '/admin/queue'
        }
      ],
      system_stats: {
        cpu: 0,
        memory: 0,
        storage: 0,
        uptime: 'Unknown',
        ollama: {
          status: 'Unknown',
          model: 'Unknown',
          version: 'Unknown'
        }
      },
      recent_activities: []
    };
  }
};

/**
 * Fetch IP whitelist data from the API
 */
export const fetchIpWhitelist = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetchApi('/admin/ip-whitelist', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch IP whitelist: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching IP whitelist:', error);
    return [];
  }
};