import { Injectable } from '@nestjs/common';
import { JwtPort } from '@/shared-kernel/auth';
import { ConfigPort } from '@/shared-kernel/config';
import type { SessionPayload } from '../../domain/entities/session.entity';
import type { TokenGeneratorPort, TokenPair, TokenPayload } from '../../domain/ports';

@Injectable()
export class JwtTokenGenerator implements TokenGeneratorPort {
  private readonly accessTokenExpiresIn: number;
  private readonly sessionExpiryDays: number;

  constructor(
    private readonly jwtService: JwtPort,
    private readonly configService: ConfigPort,
  ) {
    this.accessTokenExpiresIn = this.configService.getOrDefault<number>(
      'JWT_ACCESS_TOKEN_EXPIRES_IN',
      3600, // 1 hour default
    );
    this.sessionExpiryDays = this.configService.getOrDefault<number>(
      'SESSION_EXPIRY_DAYS',
      7, // 7 days default
    );
  }

  async generateTokenPair(payload: TokenPayload): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: payload.userId,
        email: payload.email,
      },
      {
        expiresIn: this.accessTokenExpiresIn,
      },
    );

    const refreshToken = this.generateRefreshToken();

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  async generateSessionToken(payload: SessionPayload): Promise<string> {
    // Session tokens have all session info embedded
    // They are used for cookie-based auth
    // Calculate expiresIn based on payload.exp (JWT library conflicts if both exp and expiresIn are set)
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = Math.max(payload.exp - nowInSeconds, 0);

    return this.jwtService.signAsync(
      {
        sub: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
        iat: payload.iat,
        // Don't include exp here - use expiresIn option instead
      },
      {
        expiresIn: expiresInSeconds,
      },
    );
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const decoded = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
    return {
      userId: decoded.sub,
      email: decoded.email,
    };
  }

  async verifySessionToken(token: string): Promise<SessionPayload> {
    const decoded = await this.jwtService.verifyAsync<{
      sub: string;
      email: string;
      sessionId: string;
      iat: number;
      exp: number;
    }>(token);
    return {
      sub: decoded.sub,
      email: decoded.email,
      sessionId: decoded.sessionId,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }

  generateRefreshToken(): string {
    return crypto.randomUUID();
  }
}
