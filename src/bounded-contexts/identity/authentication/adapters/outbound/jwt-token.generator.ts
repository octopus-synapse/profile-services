import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SessionPayload } from '../../domain/entities/session.entity';
import type { TokenGeneratorPort, TokenPair, TokenPayload } from '../../ports/outbound';

@Injectable()
export class JwtTokenGenerator implements TokenGeneratorPort {
  private readonly accessTokenExpiresIn: number;
  private readonly sessionExpiryDays: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenExpiresIn = this.configService.get<number>(
      'JWT_ACCESS_TOKEN_EXPIRES_IN',
      3600, // 1 hour default
    );
    this.sessionExpiryDays = this.configService.get<number>(
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
    return this.jwtService.signAsync(
      {
        sub: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
        iat: payload.iat,
        exp: payload.exp,
      },
      {
        expiresIn: `${this.sessionExpiryDays}d`,
      },
    );
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const decoded = await this.jwtService.verifyAsync(token);
    return {
      userId: decoded.sub,
      email: decoded.email,
    };
  }

  async verifySessionToken(token: string): Promise<SessionPayload> {
    const decoded = await this.jwtService.verifyAsync(token);
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
