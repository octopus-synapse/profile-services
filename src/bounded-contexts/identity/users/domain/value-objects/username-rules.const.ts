/**
 * Username Rules — Value Object (constants).
 *
 * Single source of truth for the format rules of `User.username`. Lifted
 * out of `users/domain/schemas/username.schema.ts` so both the Zod schema
 * and the CheckUsernameAvailability use case read from a single place,
 * and so the frontend can fetch the same numbers via
 * `GET /v1/users/username/rules` and gate input client-side without
 * duplicating regex literals.
 *
 * Mutating any field here is a breaking change for both backend
 * validation and frontend forms — bump the SDK version when changed.
 */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/**
 * Core character set: lowercase letters, digits, underscore. Used by the
 * primary regex + by the public `/rules` endpoint so the frontend can
 * compile the same RegExp.
 */
export const USERNAME_PATTERN_SOURCE = '^[a-z0-9_]+$';

/** First character must be alphanumeric (no leading underscore). */
export const USERNAME_STARTS_OK_SOURCE = '^[a-z0-9]';

/** Last character must be alphanumeric (no trailing underscore). */
export const USERNAME_ENDS_OK_SOURCE = '[a-z0-9]$';

/** Substring forbidden anywhere in the username. */
export const USERNAME_FORBIDDEN_DOUBLE_UNDERSCORE = '__';

/** Pre-compiled regexes for backend use. The `.source` strings are what
 * the SDK exposes to the frontend so the client compiles its own. */
export const USERNAME_PATTERN_RE = new RegExp(USERNAME_PATTERN_SOURCE);
export const USERNAME_STARTS_OK_RE = new RegExp(USERNAME_STARTS_OK_SOURCE);
export const USERNAME_ENDS_OK_RE = new RegExp(USERNAME_ENDS_OK_SOURCE);

/** Programmatic format check. Mirrors what `UsernameSchema` validates
 * (excluding reserved-list check, which is data-driven). */
export function isValidUsernameFormat(username: string): boolean {
  if (username.length < USERNAME_MIN_LENGTH) return false;
  if (username.length > USERNAME_MAX_LENGTH) return false;
  if (!USERNAME_PATTERN_RE.test(username)) return false;
  if (!USERNAME_STARTS_OK_RE.test(username)) return false;
  if (!USERNAME_ENDS_OK_RE.test(username)) return false;
  if (username.includes(USERNAME_FORBIDDEN_DOUBLE_UNDERSCORE)) return false;
  return true;
}
