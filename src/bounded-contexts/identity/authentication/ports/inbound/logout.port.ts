/**
 * Logout Port (Inbound)
 *
 * Use-case interface for user logout.
 */

export interface LogoutCommand {
  userId: string;
  refreshToken?: string;
  logoutAllSessions?: boolean;
}

export interface LogoutResult {
  success: true;
}

export interface LogoutPort {
  /**
   * Logs out the user by invalidating refresh token(s).
   */
  execute(command: LogoutCommand): Promise<LogoutResult>;
}

export const LOGOUT_PORT = Symbol('LogoutPort');
