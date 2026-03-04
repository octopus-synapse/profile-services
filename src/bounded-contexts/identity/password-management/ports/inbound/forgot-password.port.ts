/**
 * Forgot Password Port (Inbound)
 *
 * Use-case interface for requesting a password reset.
 */

export interface ForgotPasswordCommand {
  email: string;
}

export interface ForgotPasswordPort {
  /**
   * Initiates password reset by sending email with reset token.
   * Always returns success to prevent email enumeration attacks.
   */
  execute(command: ForgotPasswordCommand): Promise<void>;
}

export const FORGOT_PASSWORD_PORT = Symbol('ForgotPasswordPort');
