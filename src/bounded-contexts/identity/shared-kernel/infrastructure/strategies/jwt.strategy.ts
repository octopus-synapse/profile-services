import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AUTH_CONFIG } from '@/shared-kernel/constants/app.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  hasCompletedOnboarding?: boolean;
  iat?: number;
  // Session token specific fields
  sessionId?: string;
}

export interface AuthenticatedUser {
  id: string; // For PermissionGuard compatibility
  userId: string;
  email: string;
  name: string | null;
  hasCompletedOnboarding: boolean;
  emailVerified: boolean;
  roles: string[]; // For permission resolution
}

const USER_NOT_FOUND_MESSAGE = 'User not found';
const TOKEN_INVALIDATED_MESSAGE = 'Token has been invalidated';
const TOKEN_VALID_AFTER_KEY_PREFIX = 'auth:token_valid_after:';

/**
 * Custom JWT extractor that checks both cookie and Authorization header
 * Priority: Cookie first (for browser requests), then Authorization header (for API clients)
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  if (req.cookies?.[AUTH_CONFIG.SESSION_COOKIE_NAME]) {
    return req.cookies[AUTH_CONFIG.SESSION_COOKIE_NAME];
  }

  // 2. Fall back to Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * JWT Strategy for Passport
 *
 * Validates JWT tokens and returns authenticated user data.
 * Supports both:
 * - Cookie-based sessions (httpOnly cookie with session token)
 * - Bearer token authentication (for API clients/SDK)
 *
 * Works with JwtAuthGuard to protect routes.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
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
        roles: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(USER_NOT_FOUND_MESSAGE);
    }

    // Check if token was issued before a password change
    // Tokens issued AT or BEFORE the invalidation timestamp are considered invalid
    // (use <= to handle same-second edge case)
    const tokenValidAfter = await this.cacheService.get<number>(
      `${TOKEN_VALID_AFTER_KEY_PREFIX}${payload.sub}`,
    );

    if (tokenValidAfter && payload.iat && payload.iat <= tokenValidAfter) {
      throw new UnauthorizedException(TOKEN_INVALIDATED_MESSAGE);
    }

    return {
      id: user.id, // For PermissionGuard compatibility
      userId: user.id,
      email: user.email ?? '',
      name: user.name,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      emailVerified: !!user.emailVerified,
      roles: user.roles,
    };
  }

  /**
   * Static helper for cache key generation
   */
  static getTokenValidAfterKey(userId: string): string {
    return `${TOKEN_VALID_AFTER_KEY_PREFIX}${userId}`;
  }
}
