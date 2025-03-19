/**
 * API path configurations for admin dashboard
 */

// API Path Configuration 
// These match the actual backend implementation
export const API_PATHS = {
  ADMIN: {
    TOKENS: '/admin/tokens',
    API_KEYS: '/admin/api-keys',
    IP_WHITELIST: '/admin/ip-whitelist',
    CLIENT_IP: '/admin/client-ip',
    SYSTEM_STATS: '/admin/system/stats',
    QUEUE_STATS: '/admin/queue/stats',
    QUEUE_ITEMS: '/admin/queue/items',
    QUEUE_HISTORY: '/admin/queue/history',
    USAGE_STATS: '/admin/usage/stats',
    USERS: '/auth/users',
    ACTIVITIES: '/auth/activities',
    MODELS: '/admin/system/models',
    SET_MODEL: '/admin/system/model',
    SUMMARIZATION_SETTINGS: '/admin/system/summarization-settings'
  }
};