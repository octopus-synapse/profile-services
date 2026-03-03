/**
 * Account Lifecycle Domain Exceptions
 */
import { ConflictException, DomainException } from '../../../shared-kernel/exceptions';

/**
 * Account Already Exists Exception
 *
 * Thrown when trying to create an account with existing email.
 */
export class AccountAlreadyExistsException extends ConflictException {
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
  constructor() {
    super('Account deletion requires explicit confirmation');
  }
}
