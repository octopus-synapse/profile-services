import { DomainException } from '@/shared-kernel/exceptions';

/**
 * Refusal to link an OAuth profile to an existing User by email when either
 * side of the link does not have a verified email. Without this check an
 * attacker can register a provider account under a victim's email (provider
 * doesn't enforce verification, e.g. squat-and-link in some flows) and inherit
 * the victim's profile on callback.
 */
export class OAuthEmailMismatchException extends DomainException {
  readonly code = 'OAUTH_EMAIL_NOT_VERIFIED';
  readonly statusHint = 409;

  constructor() {
    super('OAuth profile email or existing account email is not verified; manual linking required');
  }
}

/**
 * OAuth callback rejected because the `state` parameter is missing, doesn't
 * match the cookie set on `/start`, or expired. Prevents login-CSRF where an
 * attacker forces a victim's browser to submit the attacker's authorization
 * code (account-takeover via OAuth confused-deputy).
 */
export class OAuthStateMismatchException extends DomainException {
  readonly code = 'OAUTH_STATE_INVALID';
  readonly statusHint = 400;

  constructor() {
    super('OAuth state cookie missing, mismatched, or expired');
  }
}
