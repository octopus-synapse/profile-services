/**
 * Regex Patterns for Validation
 *
 * Common regular expressions for input validation.
 */
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/,
  USERNAME: /^[a-zA-Z0-9_-]+$/,
  PHONE: /^[\d\s\-+()]+$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  /** At least 1 uppercase, 1 lowercase, 1 number, 1 special char */
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
} as const;

export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIREMENTS_MESSAGE:
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
} as const;

export const DATE = {
  MIN_YEAR: 1950,
  /** Allows up to 10 years in the future */
  MAX_YEAR: new Date().getFullYear() + 10,
} as const;
