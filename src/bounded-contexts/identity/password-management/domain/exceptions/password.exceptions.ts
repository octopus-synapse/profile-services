/**
 * Password Management Domain Exceptions
 */
import {
  DomainException,
  UnauthorizedException,
  ValidationException,
} from '@/shared-kernel/exceptions';

/**
 * Weak Password Exception
 *
 * Thrown when password doesn't meet strength requirements.
 */
export class WeakPasswordException extends ValidationException {
  override readonly code: string = 'PASSWORD_WEAK';
  constructor(violations: string[]) {
    super('Password does not meet security requirements', { password: violations });
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
  override readonly code: string = 'INVALID_CURRENT_PASSWORD';
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
  override readonly code: string = 'PASSWORD_SAME_AS_CURRENT';
  constructor() {
    super('New password must be different from current password', {
      newPassword: ['New password cannot be the same as current password'],
    });
  }
}

/**
 * Invalid Password-Change Code Exception
 *
 * Thrown when the emailed confirmation code is wrong or expired during the
 * two-step password change.
 */
export class InvalidPasswordChangeCodeException extends DomainException {
  readonly code = 'INVALID_PASSWORD_CHANGE_CODE';
  readonly statusHint = 400;

  constructor() {
    super('The confirmation code is invalid or has expired');
  }
}

/**
 * Thrown when the requested new email equals the current one.
 */
export class EmailSameAsCurrentException extends ValidationException {
  override readonly code: string = 'EMAIL_SAME_AS_CURRENT';
  constructor() {
    super('New email must be different from your current email', {
      newEmail: ['New email cannot be the same as the current email'],
    });
  }
}

/**
 * Thrown when the requested new email already belongs to another account.
 */
export class EmailAlreadyInUseException extends DomainException {
  readonly code = 'EMAIL_IN_USE';
  readonly statusHint = 409;

  constructor() {
    super('This email is already in use');
  }
}

/**
 * Thrown when the emailed email-change code is wrong or expired.
 */
export class InvalidEmailChangeCodeException extends DomainException {
  readonly code = 'INVALID_EMAIL_CHANGE_CODE';
  readonly statusHint = 400;

  constructor() {
    super('The confirmation code is invalid or has expired');
  }
}
