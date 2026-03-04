/**
 * Password Value Object
 *
 * Encapsulates password with validation rules.
 * Used for new password validation (not for stored hashes).
 */
import { WeakPasswordException } from '../exceptions';

export interface PasswordStrengthViolation {
  rule: string;
  message: string;
}

export class Password {
  private readonly value: string;

  private constructor(password: string) {
    this.value = password;
  }

  /**
   * Creates a Password from a plain string with validation
   * @throws WeakPasswordException if password doesn't meet requirements
   */
  static create(password: string): Password {
    const violations = Password.validate(password);
    if (violations.length > 0) {
      throw new WeakPasswordException(violations.map((v) => v.message));
    }
    return new Password(password);
  }

  /**
   * Creates a Password without validation (for testing)
   */
  static fromString(password: string): Password {
    return new Password(password);
  }

  /**
   * Validates password strength
   */
  static validate(password: string): PasswordStrengthViolation[] {
    const violations: PasswordStrengthViolation[] = [];

    if (!password || password.length < 8) {
      violations.push({
        rule: 'minLength',
        message: 'Password must be at least 8 characters long',
      });
    }

    if (password && password.length > 128) {
      violations.push({
        rule: 'maxLength',
        message: 'Password must be at most 128 characters long',
      });
    }

    if (!/[A-Z]/.test(password)) {
      violations.push({
        rule: 'uppercase',
        message: 'Password must contain at least one uppercase letter',
      });
    }

    if (!/[a-z]/.test(password)) {
      violations.push({
        rule: 'lowercase',
        message: 'Password must contain at least one lowercase letter',
      });
    }

    if (!/[0-9]/.test(password)) {
      violations.push({
        rule: 'number',
        message: 'Password must contain at least one number',
      });
    }

    return violations;
  }

  /**
   * Checks if password meets all requirements
   */
  static isValid(password: string): boolean {
    return Password.validate(password).length === 0;
  }

  /**
   * Returns the primitive value
   */
  toString(): string {
    return this.value;
  }

  /**
   * Returns the primitive value
   */
  getValue(): string {
    return this.value;
  }
}
