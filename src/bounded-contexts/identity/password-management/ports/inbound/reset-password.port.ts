/**
 * Reset Password Port (Inbound)
 *
 * Use-case interface for resetting password with token.
 */

export interface ResetPasswordCommand {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResult {
  success: true;
}

export interface ResetPasswordPort {
  /**
   * Resets user password using a valid reset token.
   * @throws InvalidResetTokenException if token is invalid or expired
   * @throws WeakPasswordException if new password doesn't meet requirements
   */
  execute(command: ResetPasswordCommand): Promise<ResetPasswordResult>;
}

export const RESET_PASSWORD_PORT = Symbol('ResetPasswordPort');
