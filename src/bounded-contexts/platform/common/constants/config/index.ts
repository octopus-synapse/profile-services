/**
 * Configuration Constants - Barrel Export
 *
 * Re-exports all configuration constants from a single entry point.
 */

export { API_LIMITS } from './api-limits.const';
export {
  APP_CONFIG,
  CACHE_CONFIG,
  EXPORT_CONFIG,
  FILE_UPLOAD_CONFIG,
  RATE_LIMIT_CONFIG,
} from './app-config.const';
export { CRYPTO_CONSTANTS } from './crypto.const';
export { ERROR_MESSAGES } from './error-messages.const';
export { SUCCESS_MESSAGES } from './success-messages.const';
export { TIME_MS, TOKEN_EXPIRY } from './time.const';

// Legacy APP_CONSTANTS for backward compatibility
// Maps to individual config objects
export const APP_CONSTANTS = {
  JWT_EXPIRATION: '15m', // APP_CONFIG value
  BCRYPT_ROUNDS: 10, // APP_CONFIG value
  RATE_LIMIT_TTL: 60000, // RATE_LIMIT_CONFIG value
  RATE_LIMIT_MAX_REQUESTS: 100, // RATE_LIMIT_CONFIG value
  AUTH_RATE_LIMIT_MAX_REQUESTS: 5, // RATE_LIMIT_CONFIG value
  DEFAULT_PAGE_SIZE: 10, // APP_CONFIG value
  MAX_PAGE_SIZE: 100, // APP_CONFIG value
  SEARCH_DEFAULT_LIMIT: 20, // APP_CONFIG value
  SEARCH_AUTOCOMPLETE_LIMIT: 10, // APP_CONFIG value
  SEARCH_MAX_RESULTS: 1000, // APP_CONFIG value
  MAX_FILE_SIZE: 5 * 1024 * 1024, // FILE_UPLOAD_CONFIG value (5MB)
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'], // FILE_UPLOAD_CONFIG value
  PUPPETEER_TIMEOUT: 30000, // EXPORT_CONFIG value
  PDF_MAX_PAGES: 10, // EXPORT_CONFIG value
};
