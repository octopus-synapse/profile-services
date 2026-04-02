/**
 * Password Reset Token Service Port
 *
 * Outbound port for password reset token operations.
 * Handles token creation and validation.
 */

export interface PasswordResetTokenPort {
  /**
   * Stores a password reset token for a user
   */
  createToken(userId: string, token: string): Promise<void>;

  /**
   * Validates a password reset token
   * @returns The userId associated with the token
   * @throws InvalidResetTokenException if token is invalid or expired
   */
  validateToken(token: string): Promise<string>;

  /**
   * Atomically validates and consumes a token (prevents race conditions)
   * @returns The userId associated with the token
   * @throws InvalidResetTokenException if token is invalid, expired, or already used
   */
  validateAndConsumeToken(token: string): Promise<string>;

  /**
   * Invalidates a token after use
   */
  invalidateToken(token: string): Promise<void>;
}

export const PASSWORD_RESET_TOKEN_PORT = Symbol('PasswordResetTokenPort');
