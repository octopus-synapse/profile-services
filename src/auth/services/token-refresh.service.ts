/**
 * Token Refresh Service
 * Single Responsibility: Handle token refresh operations
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { ERROR_MESSAGES } from '../../common/constants/app.constants';
import { TokenService } from './token.service';

@Injectable()
export class TokenRefreshService {
  private readonly context = 'TokenRefreshService';

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
    private readonly tokenService: TokenService,
  ) {}

  async refreshToken(userId: string) {
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

    if (!user || !user.email) {
      this.logger.warn(`Token refresh failed - user not found`, this.context, {
        userId,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const token = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });

    this.logger.debug(`Token refreshed`, this.context, { userId });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
      },
    };
  }
}
