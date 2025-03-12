/**
 * Type definitions for admin dashboard components
 */

// Dashboard card type
export interface DashboardCard {
  id: string;
  title: string;
  count: number;
  active?: number;
  processing?: number;
  path: string;
}

// System statistics
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

// Activity feed item
export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'api-key' | 'ip' | 'token' | 'queue';
}

// Dashboard data structure
export interface DashboardData {
  dashboard_cards: DashboardCard[];
  system_stats: SystemStats;
  recent_activities: Activity[];
}

// Registration token
export interface RegistrationToken {
  id: string;
  token: string;
  created: string;
  expires: string | null;
  used: boolean;
  usedBy: string | null;
  usedOn: string | null;
}

// API key
export interface ApiKey {
  id: number; // Backend returns numeric ID
  key: string;
  description: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  last_used: string | null;
  usage_count: number;
}

// IP whitelist entry
export interface IPWhitelistEntry {
  id: number; // Backend returns numeric ID
  ip: string;
  added: string;
  lastUsed: string | null;
  is_active: boolean;
}

// Queue item
export interface QueueItem {
  id: string;
  priority: number;
  status: string;
  created_at: string;
  user_id: string;
  username: string;
  prompt_tokens?: number;
  max_tokens?: number;
  model?: string;
  queue_wait_time?: number;
  service?: string;
  content?: string;
  estimatedCompletion?: string;
}

// History item (completed queue item)
export interface HistoryItem extends QueueItem {
  completed_at: string;
  processing_time: number;
  completion_tokens?: number;
  total_tokens?: number;
}

// Queue statistics
export interface QueueStats {
  total_waiting: number;
  total_processing: number;
  total_completed: number;
  total_error: number;
  requests_per_hour: number;
  // Consistent naming for wait/process times
  average_wait_time?: number;
  average_processing_time?: number;
  queue_by_priority?: Record<string, number>;
  queue_connected?: boolean;
  worker_count?: number;
}

// User management
export interface User {
  id: string;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}