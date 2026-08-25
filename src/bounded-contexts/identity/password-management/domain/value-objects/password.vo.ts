/**
 * Password Value Object
 *
 * Encapsulates password with validation rules.
 * Used for new password validation (not for stored hashes).
 */
import {
  PASSWORD_POLICY,
  PASSWORD_RULES,
} from '@/shared-kernel/schemas/primitives/password.schema';
import { WeakPasswordException } from '../exceptions';

/** One failed policy rule — `code` is the VALIDATION_DICTIONARY key. */
export interface PasswordStrengthViolation {
  readonly code: string;
  readonly params: Readonly<Record<string, string | number>>;
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
      throw new WeakPasswordException(violations);
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
    const value = password ?? '';
    const violations: PasswordStrengthViolation[] = [];

    // Same policy the request schema enforces — derived, never re-typed,
    // so changing PASSWORD_POLICY moves both gates at once.
    if (value.length < PASSWORD_POLICY.minLength) {
      violations.push({ code: 'STRING_TOO_SHORT', params: { min: PASSWORD_POLICY.minLength } });
    }
    if (value.length > PASSWORD_POLICY.maxLength) {
      violations.push({ code: 'STRING_TOO_LONG', params: { max: PASSWORD_POLICY.maxLength } });
    }
    for (const rule of PASSWORD_RULES) {
      if (!rule.test(value)) violations.push({ code: rule.code, params: rule.params });
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
