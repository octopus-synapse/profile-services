/**
 * Email Verification Domain Exceptions
 */
import { ConflictException, DomainException } from '@/shared-kernel/exceptions';

/**
 * Invalid Verification Token Exception
 *
 * Thrown when verification token is invalid or expired.
 */
export class InvalidVerificationTokenException extends DomainException {
  readonly code = 'INVALID_VERIFICATION_TOKEN';
  readonly statusHint = 400;
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
  readonly code: string = 'EMAIL_ALREADY_VERIFIED';
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
  readonly statusHint = 429;
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number = 60) {
    super(
      `Verification email was already sent. Please wait ${retryAfterSeconds} seconds before requesting a new one.`,
    );
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Email Not Verified Exception
 *
 * Raised by EmailVerifiedGuard when a protected endpoint is accessed by an
 * authenticated user whose email is still pending verification. Maps to 403
 * — the user is identified but lacks the verification credential.
 */
export class EmailNotVerifiedException extends DomainException {
  readonly code = 'EMAIL_NOT_VERIFIED';
  readonly statusHint = 403;
  constructor() {
    super('Email address must be verified to access this resource');
  }
}
