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

export abstract class RefreshTokenPort {
  /**
   * Refreshes access token using a valid refresh token.
   * @throws InvalidRefreshTokenException if token is invalid or expired
   */
  abstract execute(command: RefreshTokenCommand): Promise<RefreshTokenResult>;
}
