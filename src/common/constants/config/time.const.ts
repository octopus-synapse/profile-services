/**
 * Time Constants
 *
 * Time conversion constants and token expiry durations.
 * Eliminates magic numbers for time-based calculations.
 */

/** Time in milliseconds */
export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

/** Token expiration durations */
export const TOKEN_EXPIRY = {
  EMAIL_VERIFICATION_HOURS: 24,
  PASSWORD_RESET_HOURS: 1,
  CACHE_VALIDITY_DAYS: 7,
  RECENT_ACTIVITY_DAYS: 30,
} as const;
