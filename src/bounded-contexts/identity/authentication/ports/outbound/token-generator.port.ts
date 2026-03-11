/**
 * Token Generator Port
 *
 * Outbound port for JWT token operations.
 */

import type { SessionPayload } from '../../domain/entities/session.entity';

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
   * Generates a session token (for cookie-based auth)
   * Session tokens include sessionId and have longer expiry
   */
  generateSessionToken(payload: SessionPayload): Promise<string>;

  /**
   * Verifies and decodes an access token
   */
  verifyAccessToken(token: string): Promise<TokenPayload>;

  /**
   * Verifies and decodes a session token
   */
  verifySessionToken(token: string): Promise<SessionPayload>;

  /**
   * Generates a random refresh token
   */
  generateRefreshToken(): string;
}
