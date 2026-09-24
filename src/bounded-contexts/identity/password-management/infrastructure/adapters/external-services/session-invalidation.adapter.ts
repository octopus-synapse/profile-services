/**
 * Session Invalidation Adapter
 *
 * Implements synchronous session invalidation for credential changes.
 * Uses Redis for token timestamp and Prisma for refresh token cleanup.
 */

import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SessionInvalidationPort } from '../../../domain/ports';

// Keep the revocation marker for the longest possible session lifetime.
const SECONDS_PER_DAY = 24 * 60 * 60;
const TOKEN_VALID_AFTER_KEY_PREFIX = 'auth:token_valid_after:';

export class SessionInvalidationAdapter implements SessionInvalidationPort {
  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
    private readonly maxSessionDays = 30,
  ) {}

  async invalidateAllSessions(userId: string): Promise<void> {
    // Set token invalidation timestamp - any JWT issued before this time is invalid
    // Uses setSecure() to fail-closed: if Redis write fails, the operation fails
    // This prevents the security issue of old tokens remaining valid after password reset
    const now = Math.floor(Date.now() / 1000);
    await this.cacheService.setSecure(
      `${TOKEN_VALID_AFTER_KEY_PREFIX}${userId}`,
      now,
      Math.max(1, this.maxSessionDays) * SECONDS_PER_DAY,
    );

    // Delete all refresh tokens for the user
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
