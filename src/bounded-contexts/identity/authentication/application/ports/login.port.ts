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

export interface LoginVerify2faCommand {
  userId: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  twoFactorRequired?: boolean;
  /** Used internally by the controller for session creation — not exposed in the API response */
  email?: string;
}

export abstract class LoginPort {
  /**
   * Authenticates user with email and password.
   * Returns twoFactorRequired: true when 2FA is enabled (no tokens issued).
   * @throws InvalidCredentialsException if credentials are invalid
   * @throws AccountDeactivatedException if account is deactivated
   */
  abstract execute(command: LoginCommand): Promise<LoginResult>;

  /**
   * Completes login by validating a 2FA code after password verification.
   * @throws InvalidCredentialsException if userId is invalid
   * @throws Invalid2faCodeException if the code is wrong
   */
  abstract completeWithTwoFactor(command: LoginVerify2faCommand): Promise<LoginResult>;
}
