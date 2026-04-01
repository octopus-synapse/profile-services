/**
 * Refresh Token Port (Inbound)
 *
 * Use-case interface for refreshing access token.
 */

export interface RefreshTokenCommand {
  refreshToken: string;
}

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenPort {
  /**
   * Refreshes access token using a valid refresh token.
   * @throws InvalidRefreshTokenException if token is invalid or expired
   */
  execute(command: RefreshTokenCommand): Promise<RefreshTokenResult>;
}

export const REFRESH_TOKEN_PORT = Symbol('RefreshTokenPort');
