/**
 * Validation Constants - Re-export for backward compatibility
 *
 * This file has been refactored. All validation constants are now
 * split into smaller files under ./validation/ directory.
 *
 * @see ./validation/index.ts for the new structure
 * @deprecated Import directly from './validation' instead
 */

export {
  STRING_LENGTH,
  ARRAY_LIMIT,
  FILE,
  REGEX,
  PASSWORD_REQUIREMENTS,
  DATE,
  RATE_LIMIT,
  PAGINATION,
  CACHE_TTL,
  HTTP_STATUS,
} from './validation';
