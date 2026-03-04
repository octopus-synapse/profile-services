/**
 * Email Value Object
 *
 * Encapsulates email address with validation.
 * Immutable, normalized (lowercase), and equality-based.
 */
import { ValidationException } from '../../exceptions';

export class Email {
  private readonly value: string;

  private constructor(email: string) {
    this.value = email.toLowerCase().trim();
  }

  /**
   * Creates an Email from a string
   * @throws ValidationException if email format is invalid
   */
  static create(email: string): Email {
    if (!email || !Email.isValid(email)) {
      throw new ValidationException('Invalid email format', [
        'Email must be a valid email address',
      ]);
    }
    return new Email(email);
  }

  /**
   * Creates an Email without validation (for internal use/hydration)
   */
  static fromString(email: string): Email {
    return new Email(email);
  }

  /**
   * Validates email format
   */
  private static isValid(email: string): boolean {
    // RFC 5322 simplified regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
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

  /**
   * Gets the domain part of the email
   */
  getDomain(): string {
    return this.value.split('@')[1];
  }

  /**
   * Gets the local part of the email (before @)
   */
  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  /**
   * Checks equality with another Email
   */
  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
