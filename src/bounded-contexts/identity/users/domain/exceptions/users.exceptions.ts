/**
 * Users Bounded Context Exceptions
 */
import {
  ConflictException,
  ForbiddenException,
  ValidationException,
} from '../../../shared-kernel/exceptions';

export class UsernameTakenException extends ConflictException {
  readonly code: string = 'USERNAME_TAKEN';
  constructor() {
    super('Username already in use');
  }
}

export class UsernameCooldownActiveException extends ValidationException {
  readonly code: string = 'USERNAME_COOLDOWN_ACTIVE';
  constructor(cooldownDays: number, daysRemaining: number) {
    super(
      `You can only change your username once every ${cooldownDays} days. Please wait ${daysRemaining} more day(s).`,
    );
  }
}

export class UsernameMustBeLowercaseException extends ValidationException {
  readonly code: string = 'USERNAME_MUST_BE_LOWERCASE';
  constructor() {
    super('Username must be lowercase');
  }
}

export class UsernameReservedException extends ValidationException {
  readonly code: string = 'USERNAME_RESERVED';
  constructor() {
    super('This username is reserved');
  }
}

export class UsernameInvalidFormatException extends ValidationException {
  readonly code: string = 'USERNAME_INVALID_FORMAT';
  constructor() {
    super('Invalid username format');
  }
}

export class UsernameBadUnderscoresException extends ValidationException {
  readonly code: string = 'USERNAME_BAD_UNDERSCORES';
  constructor() {
    super('Username cannot contain consecutive underscores or end with an underscore');
  }
}

export class CannotDeleteOwnAccountAsAdminException extends ForbiddenException {
  readonly code: string = 'CANNOT_DELETE_OWN_ACCOUNT_AS_ADMIN';
  constructor() {
    super('Cannot delete your own account through admin interface');
  }
}

/**
 * Unique Constraint Violated Exception
 *
 * Fallback for Prisma P2002 errors when the violated field isn't one we've
 * already specialised (email / username).
 */
export class UniqueConstraintViolatedException extends ConflictException {
  readonly code: string = 'UNIQUE_CONSTRAINT_VIOLATED';
  constructor() {
    super('A unique constraint was violated');
  }
}

/**
 * Invalid User Role Exception
 *
 * Raised when an admin tries to assign a role that isn't in the allow-list.
 */
export class InvalidUserRoleException extends ValidationException {
  readonly code: string = 'INVALID_USER_ROLE';
  constructor(role: string) {
    super(`Invalid role: ${role}`);
  }
}

/**
 * Last Admin Cannot Be Removed Exception
 *
 * Blocks demoting the last remaining admin — would lock the system out of
 * admin-only operations.
 */
export class LastAdminCannotBeRemovedException extends ValidationException {
  readonly code: string = 'LAST_ADMIN_CANNOT_BE_REMOVED';
  constructor() {
    super('Cannot remove admin role from the last admin user');
  }
}

/**
 * Last Manager Cannot Be Deleted Exception
 *
 * Blocks deleting the last user holding the `user:manage` permission.
 */
export class LastManagerCannotBeDeletedException extends ValidationException {
  readonly code: string = 'LAST_MANAGER_CANNOT_BE_DELETED';
  constructor() {
    super('Cannot delete the last user with management permissions');
  }
}
