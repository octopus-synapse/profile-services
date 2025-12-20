export const APP_CONSTANTS = {
  // Authentication
  JWT_EXPIRATION: '7d',
  BCRYPT_ROUNDS: 12,

  // Rate Limiting
  RATE_LIMIT_TTL: 60, // seconds
  RATE_LIMIT_MAX_REQUESTS: 100,
  AUTH_RATE_LIMIT_MAX_REQUESTS: 5,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // File Upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],

  // Export
  PUPPETEER_TIMEOUT: 30000, // 30 seconds
  PDF_MAX_PAGES: 10,

  // Cache TTL (in seconds)
  CACHE_TTL_SHORT: 300, // 5 minutes
  CACHE_TTL_MEDIUM: 1800, // 30 minutes
  CACHE_TTL_LONG: 3600, // 1 hour

  // Onboarding
  ONBOARDING_MAX_RETRY_ATTEMPTS: 3,
} as const;

export const ERROR_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access',

  // Validation
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PASSWORD: 'Password must be at least 8 characters',
  INVALID_DATE: 'Invalid date format',

  // Resources
  RESUME_NOT_FOUND: 'Resume not found',
  RESOURCE_NOT_FOUND: 'Resource not found',
  ACCESS_DENIED: 'Access denied to this resource',

  // Export
  EXPORT_FAILED: 'Failed to export document',
  INVALID_EXPORT_FORMAT: 'Invalid export format',

  // Server
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
} as const;

export const SUCCESS_MESSAGES = {
  // Auth
  USER_REGISTERED: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',

  // Resources
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',

  // Onboarding
  ONBOARDING_COMPLETED: 'Onboarding completed successfully',
} as const;
