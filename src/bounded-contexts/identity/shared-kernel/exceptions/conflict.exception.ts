/**
 * Conflict Exception
 *
 * Thrown when an operation conflicts with existing state.
 * Examples: duplicate email, concurrent modification.
 * Maps to HTTP 409.
 */
import { DomainException } from './domain.exception';

export class ConflictException extends DomainException {
  readonly code = 'CONFLICT';
  readonly statusHint = 409;

  constructor(message: string) {
    super(message);
  }
}

/**
 * Email Already Exists Exception
 *
 * Specific conflict for duplicate email addresses.
 */
export class EmailAlreadyExistsException extends ConflictException {
  constructor(email?: string) {
    super(email ? `Email "${email}" already exists` : 'Email already exists');
  }
}
