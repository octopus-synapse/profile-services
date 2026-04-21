/**
 * Unauthorized Exception
 *
 * Thrown when authentication fails.
 * Maps to HTTP 401.
 */
import { DomainException } from './domain.exception';

export class UnauthorizedException extends DomainException {
  readonly code: string = 'UNAUTHORIZED';
  readonly statusHint = 401;

  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}

/**
 * Invalid Credentials Exception
 *
 * Specific unauthorized for login failures.
 */
export class InvalidCredentialsException extends UnauthorizedException {
  readonly code: string = 'INVALID_CREDENTIALS';
  constructor() {
    super('Invalid email or password');
  }
}

/**
 * Invalid Token Exception
 *
 * Specific unauthorized for token failures.
 */
export class InvalidTokenException extends UnauthorizedException {
  readonly code: string = 'INVALID_TOKEN';
  constructor(tokenType: string = 'Token') {
    super(`${tokenType} is invalid or expired`);
  }
}
