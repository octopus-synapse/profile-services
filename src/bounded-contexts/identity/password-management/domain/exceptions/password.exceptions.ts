/**
 * Password Management Domain Exceptions
 */
import {
  DomainException,
  UnauthorizedException,
  ValidationException,
} from '../../../shared-kernel/exceptions';

/**
 * Weak Password Exception
 *
 * Thrown when password doesn't meet strength requirements.
 */
export class WeakPasswordException extends ValidationException {
  constructor(violations: string[]) {
    super('Password does not meet security requirements', violations);
  }
}

/**
 * Invalid Reset Token Exception
 *
 * Thrown when reset token is invalid or expired.
 */
export class InvalidResetTokenException extends DomainException {
  readonly code = 'INVALID_RESET_TOKEN';
  readonly statusHint = 400;

  constructor() {
    super('Password reset token is invalid or has expired');
  }
}

/**
 * Invalid Current Password Exception
 *
 * Thrown when current password verification fails.
 */
export class InvalidCurrentPasswordException extends UnauthorizedException {
  constructor() {
    super('Current password is incorrect');
  }
}

/**
 * Same Password Exception
 *
 * Thrown when new password is same as current.
 */
export class SamePasswordException extends ValidationException {
  constructor() {
    super('New password must be different from current password', [
      'New password cannot be the same as current password',
    ]);
  }
}
