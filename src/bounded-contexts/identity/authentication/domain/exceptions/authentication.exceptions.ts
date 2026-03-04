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
  constructor() {
    super('Invalid email or password');
  }
}

/**
 * Session Expired Exception
 *
 * Thrown when the user's session has expired.
 */
export class SessionExpiredException extends UnauthorizedException {
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
