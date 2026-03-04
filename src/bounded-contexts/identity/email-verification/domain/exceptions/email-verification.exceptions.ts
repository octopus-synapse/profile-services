/**
 * Email Verification Domain Exceptions
 */
import { ConflictException, DomainException } from '../../../shared-kernel/exceptions';

/**
 * Invalid Verification Token Exception
 *
 * Thrown when verification token is invalid or expired.
 */
export class InvalidVerificationTokenException extends DomainException {
  readonly code = 'INVALID_VERIFICATION_TOKEN';
  constructor(message: string = 'Invalid or expired verification token') {
    super(message);
  }
}

/**
 * Email Already Verified Exception
 *
 * Thrown when trying to verify an already verified email.
 */
export class EmailAlreadyVerifiedException extends ConflictException {
  constructor(email?: string) {
    super(email ? `Email ${email} is already verified` : 'Email is already verified');
  }
}

/**
 * Verification Token Already Sent Exception
 *
 * Thrown when trying to send verification email too frequently.
 */
export class VerificationTokenAlreadySentException extends DomainException {
  readonly code = 'VERIFICATION_TOKEN_ALREADY_SENT';
  constructor(retryAfterMinutes: number = 5) {
    super(
      `Verification email was already sent. Please wait ${retryAfterMinutes} minutes before requesting a new one.`,
    );
  }
}
