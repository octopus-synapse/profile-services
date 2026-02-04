import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  hasCompletedOnboarding?: boolean;
  iat?: number;
}

/**
 * BUG-009 FIX: Added email verification check
 * Business rule: User must verify email to use the system
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private tokenBlacklist: TokenBlacklistService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        hasCompletedOnboarding: true,
        emailVerified: true, // BUG-009 FIX: Include emailVerified
      },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // BUG-009 FIX: Reject users with unverified email
    if (!user.emailVerified) {
      throw new UnauthorizedException(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
    }

    // BUG-023/055/056/057 FIX: Enforce token revocation after security events
    // passport-jwt includes standard claims like iat (seconds since epoch)
    const issuedAtMs = (payload.iat ?? 0) * 1000;
    const isRevoked = await this.tokenBlacklist.isTokenRevokedForUser(
      user.id,
      issuedAtMs,
    );
    if (isRevoked) {
      throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_REVOKED);
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  }
}
