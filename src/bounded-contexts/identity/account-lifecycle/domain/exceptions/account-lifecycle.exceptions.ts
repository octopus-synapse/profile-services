/**
 * Account Lifecycle Domain Exceptions
 */
import {
  ConflictException,
  DomainException,
  ForbiddenException,
  ValidationException,
} from '@/shared-kernel/exceptions';

/**
 * Account Already Exists Exception
 *
 * Thrown when trying to create an account with existing email.
 */
export class AccountAlreadyExistsException extends ConflictException {
  override readonly code: string = 'ACCOUNT_ALREADY_EXISTS';
  constructor(email: string) {
    super(`An account with email ${email} already exists`);
  }
}

/**
 * Account Deactivated Exception
 *
 * Thrown when trying to perform actions on a deactivated account.
 */
export class AccountDeactivatedException extends DomainException {
  readonly code = 'ACCOUNT_DEACTIVATED';
  readonly statusHint = 403;
  constructor() {
    super('Account is deactivated');
  }
}

/**
 * Account Already Active Exception
 *
 * Thrown when trying to reactivate an already active account.
 */
export class AccountAlreadyActiveException extends DomainException {
  readonly code = 'ACCOUNT_ALREADY_ACTIVE';
  readonly statusHint = 409;
  constructor() {
    super('Account is already active');
  }
}

/**
 * Account Deletion Requires Confirmation Exception
 *
 * Thrown when account deletion is attempted without proper confirmation.
 */
export class AccountDeletionRequiresConfirmationException extends DomainException {
  readonly code = 'DELETION_REQUIRES_CONFIRMATION';
  readonly statusHint = 400;
  constructor() {
    super('Account deletion requires explicit confirmation');
  }
}

/**
 * Invalid Account-Deletion Code Exception
 *
 * Thrown when the emailed 6-digit confirmation code is wrong or expired during
 * the two-step (code-confirmed) account deletion.
 */
export class InvalidAccountDeletionCodeException extends DomainException {
  readonly code = 'INVALID_ACCOUNT_DELETION_CODE';
  readonly statusHint = 400;
  constructor() {
    super('The confirmation code is invalid or has expired');
  }
}

/**
 * Consent Required Exception
 *
 * Thrown when the user has not accepted the current Terms of Service or
 * Privacy Policy versions. The ConsentGuard raises this to halt the
 * request pipeline until consent is recorded.
 */
export class ConsentRequiredException extends ForbiddenException {
  override readonly code: string = 'CONSENT_REQUIRED';
  constructor() {
    super('consent_required');
  }
}

/**
 * Consent Version Mismatch Exception
 *
 * Thrown during signup when the client did not acknowledge the current
 * Terms of Service / Privacy Policy versions. LGPD: signup MUST capture
 * the user's acceptance of the very versions the server believes are in
 * force right now.
 */
export class ConsentVersionMismatchException extends ValidationException {
  override readonly code: string = 'CONSENT_VERSION_MISMATCH';
  constructor(
    public readonly expectedTos: string,
    public readonly expectedPrivacy: string,
  ) {
    super(`consent_version_mismatch: expected TOS=${expectedTos}, Privacy=${expectedPrivacy}`);
  }
}
