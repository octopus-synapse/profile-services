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
  ARRAY_LIMIT,
  CACHE_TTL,
  DATE,
  FILE,
  HTTP_STATUS,
  PAGINATION,
  PASSWORD_REQUIREMENTS,
  RATE_LIMIT,
  REGEX,
  STRING_LENGTH,
} from './validation';
