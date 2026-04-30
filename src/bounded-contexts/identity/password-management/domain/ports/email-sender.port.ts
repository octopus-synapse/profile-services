/**
 * Password Reset Email Sender Port
 *
 * Outbound port for sending password reset emails.
 */

export abstract class PasswordResetEmailPort {
  /**
   * Sends a password reset email
   */
  abstract sendResetEmail(
    email: string,
    userName: string | null,
    resetToken: string,
  ): Promise<void>;
}
