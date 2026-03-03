/**
 * Email Verification Value Object
 *
 * Encapsulates email verification token with expiration.
 */
export class EmailVerificationToken {
  private readonly value: string;
  private readonly expiresAt: Date;

  private constructor(token: string, expiresAt: Date) {
    this.value = token;
    this.expiresAt = expiresAt;
  }

  /**
   * Creates a token from stored data
   */
  static create(token: string, expiresAt: Date): EmailVerificationToken {
    return new EmailVerificationToken(token, expiresAt);
  }

  /**
   * Generates a new random token with default expiration (24 hours)
   */
  static generateNew(expirationHours: number = 24): EmailVerificationToken {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    return new EmailVerificationToken(token, expiresAt);
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
  equals(other: EmailVerificationToken): boolean {
    return this.value === other.value;
  }
}
