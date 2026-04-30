/**
 * Token Generator Port
 *
 * Outbound port for JWT token operations.
 */

import type { SessionPayload } from '../entities/session.entity';

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export abstract class TokenGeneratorPort {
  /**
   * Generates access and refresh tokens
   */
  abstract generateTokenPair(payload: TokenPayload): Promise<TokenPair>;

  /**
   * Generates a session token (for cookie-based auth)
   * Session tokens include sessionId and have longer expiry
   */
  abstract generateSessionToken(payload: SessionPayload): Promise<string>;

  /**
   * Verifies and decodes an access token
   */
  abstract verifyAccessToken(token: string): Promise<TokenPayload>;

  /**
   * Verifies and decodes a session token
   */
  abstract verifySessionToken(token: string): Promise<SessionPayload>;

  /**
   * Generates a random refresh token
   */
  abstract generateRefreshToken(): string;
}
