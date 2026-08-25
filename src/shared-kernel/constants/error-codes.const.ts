/**
 * Generic HTTP-level error codes (transport fallbacks).
 *
 * NOT the catalog of user-facing codes — that is `ErrorCode` from
 * `@packages/i18n` (every `DomainException.code`, 360+ entries, both
 * locales) plus `ValidationCode` for request validation. Prefer those
 * unions; this 8-entry set exists only for framework-level envelopes
 * that carry no domain meaning.
 */
export const ERROR_CODES = {
  UNKNOWN: 'UNKNOWN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
