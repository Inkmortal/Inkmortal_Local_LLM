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
  };
  queue_connected?: boolean;
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
    
    // Return minimal data structure to avoid breaking UI but indicate service is unavailable
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
        uptime: 'Service Unavailable',
        ollama: {
          status: 'Offline',
          model: 'Service Unavailable',
          version: 'Service Unavailable'
        },
        queue_connected: false
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

/**
 * Fetch registration tokens from the API
 */
export const fetchRegistrationTokens = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetchApi('/admin/tokens', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch registration tokens: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching registration tokens:', error);
    return [];
  }
};

/**
 * Generate a new registration token
 */
export const generateRegistrationToken = async (expiryDays: number) => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetchApi('/admin/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ expires_days: expiryDays })
    });

    if (!response.ok) {
      throw new Error(`Failed to generate token: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating registration token:', error);
    throw error;
  }
};

/**
 * Revoke a registration token
 */
export const revokeRegistrationToken = async (tokenId: number) => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetchApi(`/admin/tokens/${tokenId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to revoke token: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error revoking registration token:', error);
    throw error;
  }
};

/**
 * Fetch API keys from the server
 */
export const fetchApiKeys = async () => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetchApi('/admin/api-keys', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch API keys: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }
};

/**
 * Create a new API key
 */
export const createApiKey = async (description: string, priority: number) => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetchApi('/admin/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ description, priority })
    });

    if (!response.ok) {
      throw new Error(`Failed to create API key: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
};

/**
 * Delete/revoke an API key
 */
export const deleteApiKey = async (keyId: number) => {
  try {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetchApi(`/admin/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete API key: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting API key:', error);
    throw error;
  }
};