/**
 * Application Configuration Constants
 *
 * Core configuration values for the application.
 *
 * `DEFAULT_PAGE_SIZE` and `MAX_PAGE_SIZE` re-export from
 * `shared-kernel/constants/pagination.constants.ts` (the canonical
 * source per Q3 + Q4 in the duplication audit). New BCs should import
 * the shared constants directly.
 */
import { PAGINATION } from '@/shared-kernel/constants/pagination.constants';

export const APP_CONFIG = {
  JWT_EXPIRATION: '7d',
  BCRYPT_ROUNDS: 12,
  DEFAULT_PAGE_SIZE: PAGINATION.DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE: PAGINATION.MAX_PAGE_SIZE,
  SEARCH_DEFAULT_LIMIT: 20,
  SEARCH_AUTOCOMPLETE_LIMIT: 10,
  SEARCH_MAX_RESULTS: 50,
  ONBOARDING_MAX_RETRY_ATTEMPTS: 3,
} as const;

export const RATE_LIMIT_CONFIG = { TTL: 60, MAX_REQUESTS: 100, AUTH_MAX_REQUESTS: 5 } as const;

export const FILE_UPLOAD_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const EXPORT_CONFIG = { PUPPETEER_TIMEOUT: 30000, PDF_MAX_PAGES: 10 } as const;

export const CACHE_CONFIG = { TTL_SHORT: 300, TTL_MEDIUM: 1800, TTL_LONG: 3600 } as const;
