/**
 * Validation Exception
 *
 * Thrown when input data is invalid.
 * Maps to HTTP 400.
 */
import { DomainException } from './domain.exception';

export class ValidationException extends DomainException {
  readonly code: string = 'VALIDATION_ERROR';
  readonly statusHint = 400;
  readonly violations: string[];

  constructor(message: string, violations: string[] = []) {
    super(message);
    this.violations = violations;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      violations: this.violations,
    };
  }
}

/**
 * Invalid Email Format Exception
 *
 * Specific validation failure for malformed email addresses.
 */
export class InvalidEmailFormatException extends ValidationException {
  readonly code: string = 'EMAIL_INVALID_FORMAT';
  constructor() {
    super('Invalid email format', ['Email must be a valid email address']);
  }
}
