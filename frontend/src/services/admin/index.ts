/**
 * Admin services barrel export file
 * Re-exports all admin-related services from a single entry point
 */

// Export API paths
export { API_PATHS } from './ApiPaths';

// Queue services
export { 
  fetchQueueStats, 
  fetchQueueItems, 
  fetchQueueHistory
} from './QueueService';

// User services
export { 
  fetchUsers, 
  deleteUser 
} from './UserService';

// System services
export { 
  fetchSystemStats, 
  fetchUsageStats 
} from './SystemService';

// API key services
export { 
  fetchApiKeys, 
  createApiKey, 
  deleteApiKey 
} from './ApiKeyService';

// IP whitelist services
export { 
  fetchIPWhitelist, 
  getClientIP, 
  addIPWhitelistEntry, 
  deleteIPWhitelistEntry 
} from './IPWhitelistService';

// Token services
export { 
  fetchRegistrationTokens, 
  createRegistrationToken, 
  deleteRegistrationToken
} from './TokenService';

// Activity services
export {
  fetchActivities
} from './ActivityService';

// Model services
export {
  fetchModels,
  setActiveModel
} from './ModelService';