/**
 * Password Reset Token Service Port
 *
 * Outbound port for password reset token operations.
 * Handles token creation and validation.
 */

export abstract class PasswordResetTokenPort {
  /**
   * Stores a password reset token for a user
   */
  abstract createToken(userId: string, token: string): Promise<void>;

  /**
   * Validates a password reset token
   * @returns The userId associated with the token
   * @throws InvalidResetTokenException if token is invalid or expired
   */
  abstract validateToken(token: string): Promise<string>;

  /**
   * Atomically validates and consumes a token (prevents race conditions)
   * @returns The userId associated with the token
   * @throws InvalidResetTokenException if token is invalid, expired, or already used
   */
  abstract validateAndConsumeToken(token: string): Promise<string>;

  /**
   * Invalidates a token after use
   */
  abstract invalidateToken(token: string): Promise<void>;
}
