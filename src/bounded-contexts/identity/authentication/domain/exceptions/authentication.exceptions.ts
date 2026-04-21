/**
 * Authentication Domain Exceptions
 */
import { DomainException, UnauthorizedException } from '../../../shared-kernel/exceptions';

/**
 * Invalid Credentials Exception
 *
 * Thrown when login credentials are invalid.
 */
export class InvalidCredentialsException extends UnauthorizedException {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('Invalid email or password');
  }
}

/**
 * Invalid 2FA Code Exception
 *
 * Thrown when a 2FA code is invalid during login verification.
 */
export class Invalid2faCodeException extends UnauthorizedException {
  readonly code = 'INVALID_2FA_CODE';
  constructor() {
    super('Invalid two-factor authentication code');
  }
}

/**
 * Session Expired Exception
 *
 * Thrown when the user's session has expired.
 */
export class SessionExpiredException extends UnauthorizedException {
  readonly code = 'SESSION_EXPIRED';
  constructor() {
    super('Session has expired. Please login again.');
  }
}

/**
 * Invalid Refresh Token Exception
 *
 * Thrown when refresh token is invalid or expired.
 */
export class InvalidRefreshTokenException extends UnauthorizedException {
  readonly code = 'INVALID_REFRESH_TOKEN';
  constructor() {
    super('Invalid or expired refresh token');
  }
}

/**
 * Account Locked Exception
 *
 * Thrown when account is locked due to too many failed attempts.
 */
export class AccountLockedException extends DomainException {
  readonly code = 'ACCOUNT_LOCKED';
  readonly statusHint = 423;
  constructor(remainingMinutes: number) {
    super(`Account is temporarily locked. Try again in ${remainingMinutes} minutes.`);
  }
}

/**
 * Invalid Session Exception
 *
 * Thrown when session data is malformed or invalid.
 */
export class InvalidSessionException extends DomainException {
  readonly code = 'INVALID_SESSION';
  readonly statusHint = 401;
  constructor(reason: string) {
    super(`Invalid session: ${reason}`);
  }
}

/**
 * Session User Not Found Exception
 *
 * Thrown when a user record cannot be found immediately after a session was created
 * (race / data inconsistency). HTTP 500.
 */
export class SessionUserNotFoundException extends DomainException {
  readonly code = 'SESSION_USER_NOT_FOUND';
  readonly statusHint = 500;
  constructor() {
    super('User not found after session creation');
  }
}

/**
 * Token Invalid Exception
 *
 * The token itself passed JWT signature/expiry checks but is no longer
 * acceptable — typically because the user behind `sub` no longer exists or
 * the token was forcibly invalidated (password change, logout-all).
 */
export class TokenInvalidException extends UnauthorizedException {
  readonly code = 'TOKEN_INVALID';
  constructor(reason: string) {
    super(reason);
  }
}

/**
 * Token Verification Failed Exception
 *
 * Raised when the cache layer used for the "valid-after" revocation check is
 * unreachable. We fail closed on security-critical paths so this surfaces as
 * 401 rather than 503 — the caller should retry rather than treat the user
 * as authenticated.
 */
export class TokenVerificationFailedException extends UnauthorizedException {
  readonly code = 'TOKEN_VERIFICATION_FAILED';
  constructor() {
    super('Unable to verify token validity - please try again');
  }
}
