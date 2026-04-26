/**
 * Forgot Password Port (Inbound)
 *
 * Use-case interface for requesting a password reset.
 */

export interface ForgotPasswordCommand {
  email: string;
}

export abstract class ForgotPasswordPort {
  /**
   * Initiates password reset by sending email with reset token.
   * Always returns success to prevent email enumeration attacks.
   */
  abstract execute(command: ForgotPasswordCommand): Promise<void>;
}
