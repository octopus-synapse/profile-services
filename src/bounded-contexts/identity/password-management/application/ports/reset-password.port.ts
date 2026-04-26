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

export abstract class ResetPasswordPort {
  /**
   * Resets user password using a valid reset token.
   * @throws InvalidResetTokenException if token is invalid or expired
   * @throws WeakPasswordException if new password doesn't meet requirements
   */
  abstract execute(command: ResetPasswordCommand): Promise<ResetPasswordResult>;
}
