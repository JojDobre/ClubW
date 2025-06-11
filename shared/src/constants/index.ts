// Konštanty
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout'
  },
  LICENSE: {
    VERIFY: '/api/license/verify',
    STATUS: '/api/license/status'
  }
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
} as const;
