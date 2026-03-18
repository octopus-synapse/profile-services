import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

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
}

const USER_NOT_FOUND_MESSAGE = 'User not found';
const SESSION_COOKIE_NAME = 'session';

/**
 * Custom JWT extractor that checks both cookie and Authorization header
 * Priority: Cookie first (for browser requests), then Authorization header (for API clients)
 */
function extractJwtFromCookieOrHeader(req: Request): string | null {
  // 1. Try to extract from cookie first
  if (req.cookies?.[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
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
      },
    });

    if (!user) {
      throw new UnauthorizedException(USER_NOT_FOUND_MESSAGE);
    }

    return {
      id: user.id, // For PermissionGuard compatibility
      userId: user.id,
      email: user.email ?? '',
      name: user.name,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      emailVerified: !!user.emailVerified,
    };
  }
}
