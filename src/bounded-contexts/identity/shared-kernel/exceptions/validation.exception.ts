/**
 * Validation Exception
 *
 * Thrown when input data is invalid.
 * Maps to HTTP 400.
 */
import { DomainException } from './domain.exception';

export class ValidationException extends DomainException {
  readonly code = 'VALIDATION_ERROR';
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
