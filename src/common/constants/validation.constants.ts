/**
 * Validation Constants - Magic Numbers Extraction (Clean Code G25)
 * Centralizes validation rules and limits
 */

// ==================== STRING LENGTHS ====================
export const STRING_LENGTH = {
  MIN: {
    PASSWORD: 8,
    USERNAME: 3,
    NAME: 2,
    DESCRIPTION: 10,
  },
  MAX: {
    EMAIL: 255,
    USERNAME: 50,
    NAME: 100,
    BIO: 500,
    DESCRIPTION: 2000,
    TITLE: 200,
    URL: 2048,
  },
} as const;

// ==================== ARRAY LIMITS ====================
export const ARRAY_LIMIT = {
  MAX: {
    SKILLS_PER_CATEGORY: 20,
    SKILL_CATEGORIES: 10,
    EXPERIENCES: 15,
    EDUCATION: 10,
    PROJECTS: 20,
    CERTIFICATIONS: 20,
    LANGUAGES: 10,
    AWARDS: 10,
    RECOMMENDATIONS: 10,
  },
} as const;

// ==================== FILE UPLOAD ====================
export const FILE = {
  MAX_SIZE_MB: 5,
  MAX_SIZE_BYTES: 5 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
  ],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;

// ==================== REGEX PATTERNS ====================
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  PHONE: /^[\d\s\-+()]+$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
} as const;

// ==================== DATE VALIDATION ====================
export const DATE = {
  MIN_YEAR: 1950,
  MAX_YEAR: new Date().getFullYear() + 10, // allows up to 10 years in the future
} as const;

// ==================== RATE LIMITING ====================
export const RATE_LIMIT = {
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
  EXPORT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 5,
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_ATTEMPTS: 5,
  },
} as const;

// ==================== PAGINATION ====================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
} as const;

// ==================== CACHE TTL ====================
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

// ==================== HTTP STATUS ====================
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
