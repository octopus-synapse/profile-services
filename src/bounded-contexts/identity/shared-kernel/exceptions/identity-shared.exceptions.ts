/**
 * Identity-shared domain exceptions
 *
 * Concrete subclasses of the global domain hierarchy that carry
 * identity-specific semantics (codes / messages). The base classes
 * (`ConflictException`, `ValidationException`, etc.) live in
 * `@/shared-kernel/exceptions` — there's no per-BC `DomainException`
 * anymore, so a single global filter handles the HTTP translation.
 */
import { ConflictException, ValidationException } from '@/shared-kernel/exceptions';

/** Specific conflict for duplicate email addresses. */
export class EmailAlreadyExistsException extends ConflictException {
  readonly code: string = 'EMAIL_IN_USE';
  constructor(email?: string) {
    super(email ? `Email "${email}" already exists` : 'Email already exists');
  }
}

/** Specific validation failure for malformed email addresses. */
export class InvalidEmailFormatException extends ValidationException {
  readonly code: string = 'EMAIL_INVALID_FORMAT';
  constructor() {
    super('Invalid email format', { email: ['Email must be a valid email address'] });
  }
}
