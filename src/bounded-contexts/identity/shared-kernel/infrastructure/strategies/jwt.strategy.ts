import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  hasCompletedOnboarding?: boolean;
  iat?: number;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string | null;
  hasCompletedOnboarding: boolean;
  emailVerified: boolean;
}

const USER_NOT_FOUND_MESSAGE = 'User not found';

/**
 * JWT Strategy for Passport
 *
 * Validates JWT tokens and returns authenticated user data.
 * Works with JwtAuthGuard to protect routes.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
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

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        hasCompletedOnboarding: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(USER_NOT_FOUND_MESSAGE);
    }

    return {
      userId: user.id,
      email: user.email ?? '',
      name: user.name,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      emailVerified: !!user.emailVerified,
    };
  }
}
