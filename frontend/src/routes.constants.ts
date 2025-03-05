/**
 * Route constants for the application
 * 
 * Using constants helps prevent typos and makes refactoring easier.
 * Always use these constants instead of hardcoded strings.
 */

// Root routes
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  UNAUTHORIZED: '/unauthorized',
  THEMES: '/themes',
  
  // Admin routes
  ADMIN: {
    ROOT: '/admin',
    LOGIN: '/admin/login',
    IP_WHITELIST: '/admin/ip-whitelist',
    TOKENS: '/admin/tokens',
    API_KEYS: '/admin/api-keys',
    QUEUE: '/admin/queue',
    USERS: '/admin/users',
    STATS: "/admin/stats",
    MODELS: "/admin/models",
  },
  
  // User routes
  USER: {
    PROFILE: '/user/profile',
    CHAT: '/user/chat',
  },
  
  // Direct routes
  CHAT: '/chat',
};

// Helper for creating dynamic routes
export const createRoute = (baseRoute: string, param: string) => `${baseRoute}/${param}`;

// Export for use in components
export default ROUTES;