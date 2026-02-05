/**
 * Validation Messages
 *
 * Centralized validation error messages.
 * Single source of truth for all validation feedback across frontend and backend.
 */

export const VALIDATION_MESSAGES = {
  // Required field messages
  REQUIRED: {
    USERNAME: 'Username is required',
    EMAIL: 'Email is required',
    PASSWORD: 'Password is required',
    NAME: 'Name is required',
    JOB_TITLE: 'Job title is required',
    SUMMARY: 'Summary is required',
  },

  // Invalid format messages
  INVALID: {
    USERNAME: 'Invalid username',
    EMAIL: 'Invalid email address',
    PASSWORD: 'Invalid password format',
    URL: 'Invalid URL format',
    DATE: 'Invalid date format',
  },

  // Length validation messages
  LENGTH: {
    USERNAME_TOO_SHORT: (min: number) => `Username must be at least ${min} characters`,
    USERNAME_TOO_LONG: (max: number) => `Username must not exceed ${max} characters`,
    PASSWORD_TOO_SHORT: (min: number) => `Password must be at least ${min} characters`,
    PASSWORD_TOO_LONG: (max: number) => `Password must not exceed ${max} characters`,
    SUMMARY_TOO_SHORT: (min: number) => `Summary must be at least ${min} characters`,
    SUMMARY_TOO_LONG: (max: number) => `Summary must not exceed ${max} characters`,
  },

  // Pattern validation messages
  PATTERN: {
    USERNAME_INVALID_CHARS: 'Username can only contain letters, numbers, hyphens, and underscores',
    USERNAME_MUST_START_WITH_ALPHANUMERIC: 'Username must start with a letter or number',
    USERNAME_NO_CONSECUTIVE_UNDERSCORES: 'Username cannot contain consecutive underscores',
    PASSWORD_WEAK: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  },

  // Business rule messages
  BUSINESS: {
    USERNAME_ALREADY_TAKEN: 'Username is already taken',
    EMAIL_ALREADY_REGISTERED: 'Email is already registered',
    USERNAME_RESERVED: 'This username is reserved',
    USERNAME_CHANGE_COOLDOWN: (days: number) => `You can only change your username once every ${days} days`,
  },

  // Generic messages
  GENERIC: {
    UNKNOWN_ERROR: 'An unknown error occurred',
    VALIDATION_FAILED: 'Validation failed',
  },
} as const;

/**
 * Type helper for validation messages
 */
export type ValidationMessage = string | ((param: number) => string);

/**
 * Helper to get validation message with parameters
 */
export function getValidationMessage(
  message: ValidationMessage,
  param?: number
): string {
  if (typeof message === 'function' && param !== undefined) {
    return message(param);
  }
  return message as string;
}
