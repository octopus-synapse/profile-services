/**
 * Users Bounded Context Exceptions
 */
import { ConflictException, ValidationException } from '../../../shared-kernel/exceptions';

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
