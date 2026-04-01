/**
 * Password Reset Email Sender Port
 *
 * Outbound port for sending password reset emails.
 */

export interface PasswordResetEmailPort {
  /**
   * Sends a password reset email
   */
  sendResetEmail(email: string, userName: string | null, resetToken: string): Promise<void>;
}

export const PASSWORD_RESET_EMAIL_PORT = Symbol('PasswordResetEmailPort');
