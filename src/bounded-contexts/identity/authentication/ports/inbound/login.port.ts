/**
 * Login Port (Inbound)
 *
 * Use-case interface for user login.
 */

export interface LoginCommand {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}

export interface LoginPort {
  /**
   * Authenticates user with email and password.
   * @throws InvalidCredentialsException if credentials are invalid
   * @throws AccountDeactivatedException if account is deactivated
   */
  execute(command: LoginCommand): Promise<LoginResult>;
}

export const LOGIN_PORT = Symbol('LoginPort');
