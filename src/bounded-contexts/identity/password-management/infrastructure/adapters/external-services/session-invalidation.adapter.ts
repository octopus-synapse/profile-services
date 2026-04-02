/**
 * Session Invalidation Adapter
 *
 * Implements synchronous session invalidation for credential changes.
 * Uses Redis for token timestamp and Prisma for refresh token cleanup.
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SessionInvalidationPort } from '../../../domain/ports';

// Token invalidation TTL: 24 hours (refresh tokens typically last this long)
const TOKEN_INVALIDATION_TTL_SECONDS = 24 * 60 * 60;
const TOKEN_VALID_AFTER_KEY_PREFIX = 'auth:token_valid_after:';

@Injectable()
export class SessionInvalidationAdapter implements SessionInvalidationPort {
  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {}

  async invalidateAllSessions(userId: string): Promise<void> {
    // Set token invalidation timestamp - any JWT issued before this time is invalid
    const now = Math.floor(Date.now() / 1000);
    await this.cacheService.set(
      `${TOKEN_VALID_AFTER_KEY_PREFIX}${userId}`,
      now,
      TOKEN_INVALIDATION_TTL_SECONDS,
    );

    // Delete all refresh tokens for the user
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
