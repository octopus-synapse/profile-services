/**
 * Token Refresh Service
 * Single Responsibility: Handle token refresh operations
 *
 * Note: Role-based authorization has been replaced with permission-based.
 * JWT tokens no longer contain role information.
 */

import { Injectable } from '@nestjs/common';
import {
  AuthenticationError,
  InvalidTokenError,
} from '@octopus-synapse/profile-contracts';
import { AuthUserRepository } from '../repositories';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ERROR_MESSAGES } from '@octopus-synapse/profile-contracts';
import { TokenService } from './token.service';
import { TokenBlacklistService } from './token-blacklist.service';

interface UserForTokens {
  id: string;
  email: string;
  name: string | null;
  hasCompletedOnboarding: boolean;
}

@Injectable()
export class TokenRefreshService {
  private readonly context = 'TokenRefreshService';

  constructor(
    private readonly userRepository: AuthUserRepository,
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
        throw new InvalidTokenError('revoked');
      }

      const user = await this.findUserById(decoded.sub);
      return this.generateTokensForUser(user);
    } catch {
      this.logger.warn(`Invalid refresh token`, this.context);
      throw new InvalidTokenError('refresh token invalid or expired');
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AuthenticationError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        image: user.image,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        createdAt: user.createdAt,
      },
    };
  }

  private async findUserById(userId: string): Promise<UserForTokens> {
    const user = await this.userRepository.findById(userId);

    if (!user?.email) {
      this.logger.warn(`Token refresh failed - user not found`, this.context, {
        userId,
      });
      throw new AuthenticationError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  }

  private generateTokensForUser(user: UserForTokens) {
    const accessToken = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    // For simplicity, using the same token as refresh token
    // In production, use a separate refresh token with longer expiry
    const refreshToken = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
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
