/**
 * Token Refresh Service
 * Single Responsibility: Handle token refresh operations
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import { TokenService } from './token.service';
import { TokenBlacklistService } from './token-blacklist.service';

interface UserForTokens {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  hasCompletedOnboarding: boolean;
}

@Injectable()
export class TokenRefreshService {
  private readonly context = 'TokenRefreshService';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly tokenService: TokenService,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) {}

  async refreshToken(userId: string) {
    const user = await this.findUserById(userId);
    return this.generateTokensForUser(user);
  }

  async refreshWithToken(refreshToken: string) {
    try {
      const decoded = this.tokenService.verifyToken(refreshToken);

      // BUG-023/055/056/057 FIX: Do not allow refresh if user tokens were revoked
      // iat is added by JwtService (seconds since epoch)
      const decodedAny = decoded as unknown as { iat?: number };
      const issuedAtMs = (decodedAny.iat ?? 0) * 1000;
      const isRevoked = await this.tokenBlacklist.isTokenRevokedForUser(
        decoded.sub,
        issuedAtMs,
      );
      if (isRevoked) {
        throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_REVOKED);
      }

      const user = await this.findUserById(decoded.sub);
      return this.generateTokensForUser(user);
    } catch {
      this.logger.warn(`Invalid refresh token`, this.context);
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        image: true,
        hasCompletedOnboarding: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return {
      success: true,
      data: user,
    };
  }

  private async findUserById(userId: string): Promise<UserForTokens> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        hasCompletedOnboarding: true,
      },
    });

    if (!user?.email) {
      this.logger.warn(`Token refresh failed - user not found`, this.context, {
        userId,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  }

  private generateTokensForUser(user: UserForTokens) {
    const accessToken = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    // For simplicity, using the same token as refresh token
    // In production, use a separate refresh token with longer expiry
    const refreshToken = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    this.logger.debug(`Tokens generated`, this.context, { userId: user.id });

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          hasCompletedOnboarding: user.hasCompletedOnboarding,
        },
      },
    };
  }
}
