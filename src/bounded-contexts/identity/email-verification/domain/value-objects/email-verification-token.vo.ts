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
   * Generates a new verification code — 6 numeric digits, suited for an OTP
   * input (e.g. `123456`). Uses crypto.getRandomValues (CSPRNG) for uniform
   * distribution over 10^6. Brute-force protection relies on rate limiting +
   * short TTL. Default is 15 minutes.
   */
  static generateNew(expirationMinutes: number = 15): EmailVerificationToken {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const token = (buf[0] % 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
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
