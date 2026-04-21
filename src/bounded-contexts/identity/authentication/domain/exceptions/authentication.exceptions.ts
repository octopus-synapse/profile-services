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
  constructor(reason: string) {
    super(`Invalid session: ${reason}`);
  }
}
