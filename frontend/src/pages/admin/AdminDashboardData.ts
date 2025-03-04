/**
 * Utility functions and data sources for the Admin Dashboard
 * 
 * This file defines the data structure and API interactions for the admin dashboard
 * components, keeping them separate from the UI components themselves.
 */

import { fetchApi } from '../../config/api';

// Types for Admin Dashboard
export interface DashboardCard {
  id: string;
  title: string;
  count: number;
  active?: number;
  processing?: number;
  path: string;
}

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
  queue_connected: boolean;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'api-key' | 'ip' | 'token' | 'queue';
}

export interface DashboardData {
  dashboard_cards: DashboardCard[];
  system_stats: SystemStats;
  recent_activities: Activity[];
}

export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    const statsResponse = await fetchSystemStats();
    
    // Mock dashboard cards data
    const cards: DashboardCard[] = [
      {
        id: 'ip-whitelist',
        title: 'IP Whitelist',
        count: 12,
        active: 8,
        path: '/admin/ip-whitelist'
      },
      {
        id: 'tokens',
        title: 'Registration Tokens',
        count: 5,
        active: 2,
        path: '/admin/tokens'
      },
      {
        id: 'api-keys',
        title: 'API Keys',
        count: 18,
        active: 15,
        path: '/admin/api-keys'
      },
      {
        id: 'queue',
        title: 'Queue Status',
        count: 3,
        processing: 1,
        path: '/admin/queue'
      }
    ];
    
    // Mock activity data
    const activities: Activity[] = [
      {
        id: '1',
        user: 'admin',
        action: 'created',
        target: 'API Key',
        time: '5 minutes ago',
        type: 'api-key'
      },
      {
        id: '2',
        user: 'system',
        action: 'added',
        target: 'IP Address 192.168.1.100',
        time: '10 minutes ago',
        type: 'ip'
      },
      {
        id: '3',
        user: 'admin',
        action: 'generated',
        target: 'Registration Token',
        time: '1 hour ago',
        type: 'token'
      },
      {
        id: '4',
        user: 'system',
        action: 'processed',
        target: 'Queue Item',
        time: '2 hours ago',
        type: 'queue'
      },
      {
        id: '5',
        user: 'admin',
        action: 'revoked',
        target: 'API Key',
        time: '3 hours ago',
        type: 'api-key'
      }
    ];
    
    return {
      dashboard_cards: cards,
      system_stats: statsResponse || {
        cpu: 35,
        memory: 60,
        storage: 45,
        uptime: '5 days, 6 hours',
        ollama: {
          status: 'Running',
          model: 'llama3.1-70b',
          version: '0.1.18'
        },
        queue_connected: true
      },
      recent_activities: activities
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return fallback data
    return {
      dashboard_cards: [],
      system_stats: {
        cpu: 0,
        memory: 0,
        storage: 0,
        uptime: 'Unknown',
        ollama: {
          status: 'Unknown',
          model: 'Unknown',
          version: 'Unknown'
        },
        queue_connected: false
      },
      recent_activities: []
    };
  }
};

// Types and interfaces for admin data
// =======================================================

// Registration Token Types
export interface RegistrationToken {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  description: string;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  created_by: string;
}

// API Key Types
export interface ApiKey {
  id: string;
  key: string;
  description: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  user_id: string;
  priority: number;
  created_by: string;
  usage_count: number;
}

// IP Whitelist Types
export interface IPWhitelistEntry {
  id: string;
  ip_address: string;
  description: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_by: string;
}

// API functions for Admin Dashboard
// =======================================================

/**
 * Fetch registration tokens
 */
export const fetchRegistrationTokens = async (): Promise<RegistrationToken[]> => {
  try {
    const response = await fetchApi<RegistrationToken[]>('/auth/admin/registration-tokens');
    
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
export const createRegistrationToken = async (description: string, expiresIn: number | null = null): Promise<RegistrationToken | null> => {
  try {
    const payload = {
      description,
      expires_in: expiresIn, // in hours, null means never expires
    };
    
    const response = await fetchApi<RegistrationToken>('/auth/admin/registration-tokens', {
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
    const response = await fetchApi(`/auth/admin/registration-tokens/${tokenId}`, {
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

/**
 * Fetch system stats
 */
export const fetchSystemStats = async (): Promise<SystemStats | null> => {
  try {
    const response = await fetchApi<SystemStats>('/admin/system/stats');
    
    if (!response.success) {
      throw new Error(`Failed to fetch system stats: ${response.error || response.status}`);
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
    const response = await fetchApi('/admin/usage/stats');
    
    if (!response.success) {
      throw new Error(`Failed to fetch usage stats: ${response.error || response.status}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    return null;
  }
};

/**
 * Fetch IP whitelist entries
 */
export const fetchIPWhitelist = async (): Promise<IPWhitelistEntry[]> => {
  try {
    const response = await fetchApi<IPWhitelistEntry[]>('/auth/admin/ip-whitelist');
    
    if (!response.success) {
      throw new Error(`Failed to fetch IP whitelist: ${response.error || response.status}`);
    }
    
    return response.data || [];
  } catch (error) {
    console.error('Error fetching IP whitelist:', error);
    return [];
  }
};

/**
 * Add a new IP whitelist entry
 */
export const addIPWhitelistEntry = async (ipAddress: string, description: string, expiresIn: number | null = null): Promise<IPWhitelistEntry | null> => {
  try {
    const payload = {
      ip_address: ipAddress,
      description,
      expires_in: expiresIn, // in hours, null means never expires
    };
    
    const response = await fetchApi<IPWhitelistEntry>('/auth/admin/ip-whitelist', {
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
    const response = await fetchApi(`/auth/admin/ip-whitelist/${entryId}`, {
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

/**
 * Fetch API keys
 */
export const fetchApiKeys = async (): Promise<ApiKey[]> => {
  try {
    const response = await fetchApi<ApiKey[]>('/auth/apikeys');
    
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
    
    const response = await fetchApi<ApiKey>('/auth/apikeys', {
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
export const deleteApiKey = async (keyId: string): Promise<boolean> => {
  try {
    const response = await fetchApi(`/auth/apikeys/${keyId}`, {
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