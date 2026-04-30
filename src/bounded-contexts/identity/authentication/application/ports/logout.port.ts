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

export abstract class LogoutPort {
  /**
   * Logs out the user by invalidating refresh token(s).
   */
  abstract execute(command: LogoutCommand): Promise<LogoutResult>;
}
