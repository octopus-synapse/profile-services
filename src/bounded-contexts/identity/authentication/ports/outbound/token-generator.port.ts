/**
 * Token Generator Port
 *
 * Outbound port for JWT token operations.
 */

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenGeneratorPort {
  /**
   * Generates access and refresh tokens
   */
  generateTokenPair(payload: TokenPayload): Promise<TokenPair>;

  /**
   * Verifies and decodes an access token
   */
  verifyAccessToken(token: string): Promise<TokenPayload>;

  /**
   * Generates a random refresh token
   */
  generateRefreshToken(): string;
}
