import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { TokenGeneratorPort, TokenPair, TokenPayload } from '../../ports/outbound';

@Injectable()
export class JwtTokenGenerator implements TokenGeneratorPort {
  private readonly accessTokenExpiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenExpiresIn = this.configService.get<number>(
      'JWT_ACCESS_TOKEN_EXPIRES_IN',
      3600, // 1 hour default
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

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const decoded = await this.jwtService.verifyAsync(token);
    return {
      userId: decoded.sub,
      email: decoded.email,
    };
  }

  generateRefreshToken(): string {
    return crypto.randomUUID();
  }
}
