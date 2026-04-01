/**
 * Change Password Port (Inbound)
 *
 * Use-case interface for changing password when authenticated.
 */

export interface ChangePasswordCommand {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  success: true;
}

export interface ChangePasswordPort {
  /**
   * Changes user password by verifying current password first.
   * @throws InvalidCurrentPasswordException if current password is wrong
   * @throws WeakPasswordException if new password doesn't meet requirements
   * @throws SamePasswordException if new password equals current password
   */
  execute(command: ChangePasswordCommand): Promise<ChangePasswordResult>;
}

export const CHANGE_PASSWORD_PORT = Symbol('ChangePasswordPort');
