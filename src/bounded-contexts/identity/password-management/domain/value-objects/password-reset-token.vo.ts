/**
 * Password Reset Token Value Object
 *
 * Encapsulates a password reset token with expiration tracking.
 */
export class PasswordResetToken {
  private readonly value: string;
  private readonly expiresAt: Date;

  private constructor(token: string, expiresAt: Date) {
    this.value = token;
    this.expiresAt = expiresAt;
  }

  /**
   * Creates a PasswordResetToken
   */
  static create(token: string, expiresAt: Date): PasswordResetToken {
    return new PasswordResetToken(token, expiresAt);
  }

  /**
   * Generates a new random token with default expiration (1 hour)
   */
  static generateNew(expirationMinutes: number = 60): PasswordResetToken {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    return new PasswordResetToken(token, expiresAt);
  }

  /**
   * Checks if the token has expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Checks if the token is still valid
   */
  isValid(): boolean {
    return !this.isExpired();
  }

  /**
   * Returns the token value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Returns the token value
   */
  toString(): string {
    return this.value;
  }

  /**
   * Returns the expiration date
   */
  getExpiresAt(): Date {
    return this.expiresAt;
  }

  /**
   * Checks equality with another token
   */
  equals(other: PasswordResetToken): boolean {
    return this.value === other.value;
  }
}
