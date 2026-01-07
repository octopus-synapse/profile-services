/**
 * Token Blacklist Service
 * Single Responsibility: Manage revoked/blacklisted JWT tokens
 *
 * BUG-023 FIX: Implements token revocation mechanism
 * Tokens are blacklisted when:
 * - User logs out
 * - User changes password
 * - User deletes account
 * - Admin revokes user sessions
 *
 * Design Decision: Uses Redis for blacklist storage with TTL matching token expiry.
 * If Redis is unavailable, falls back to in-memory store (for single-instance deployments).
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisConnectionService } from '../../common/cache/redis-connection.service';
import { AppLoggerService } from '../../common/logger/logger.service';

const BLACKLIST_PREFIX = 'token:blacklist:';
const USER_TOKENS_PREFIX = 'user:tokens:';
const USER_REVOKED_BEFORE_KEY_PREFIX = 'user:revoked_before:';

@Injectable()
export class TokenBlacklistService implements OnModuleInit {
  private readonly context = 'TokenBlacklistService';
  private readonly defaultTokenTtl: number;

  // In-memory fallback for when Redis is unavailable
  private readonly memoryBlacklist = new Map<string, number>();
  private readonly memoryUserRevokedBefore = new Map<string, number>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisConnection: RedisConnectionService,
    private readonly logger: AppLoggerService,
  ) {
    // Default 7 days in seconds (typical refresh token lifetime)
    this.defaultTokenTtl =
      this.configService.get<number>('JWT_REFRESH_EXPIRY_SECONDS') ??
      7 * 24 * 60 * 60;
  }

  onModuleInit() {
    // Cleanup expired tokens from memory store every hour
    this.cleanupInterval = setInterval(
      () => this.cleanupMemoryStore(),
      60 * 60 * 1000,
    );
  }

  /**
   * Add a token to the blacklist
   * @param jti - JWT ID or token hash
   * @param expiresIn - Seconds until token naturally expires (optional, uses default)
   */
  async blacklistToken(jti: string, expiresIn?: number): Promise<void> {
    const ttl = expiresIn ?? this.defaultTokenTtl;
    const key = `${BLACKLIST_PREFIX}${jti}`;

    if (this.isRedisAvailable() && this.redisConnection.client) {
      try {
        await this.redisConnection.client.setex(key, ttl, '1');
        this.logger.debug(`Token blacklisted: ${jti}`, this.context);
        return;
      } catch (error) {
        this.logger.warn(
          `Redis blacklist failed, using memory fallback`,
          this.context,
          { error },
        );
      }
    }

    // Fallback to memory store
    const expiryTime = Date.now() + ttl * 1000;
    this.memoryBlacklist.set(jti, expiryTime);
    this.logger.debug(`Token blacklisted in memory: ${jti}`, this.context);
  }

  /**
   * Check if a token is blacklisted
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${BLACKLIST_PREFIX}${jti}`;

    if (this.isRedisAvailable() && this.redisConnection.client) {
      try {
        const exists = await this.redisConnection.client.exists(key);
        return exists === 1;
      } catch (error) {
        this.logger.warn(
          `Redis check failed, using memory fallback`,
          this.context,
          { error },
        );
      }
    }

    // Fallback to memory store
    const expiryTime = this.memoryBlacklist.get(jti);
    if (!expiryTime) return false;

    // Check if expired
    if (Date.now() > expiryTime) {
      this.memoryBlacklist.delete(jti);
      return false;
    }

    return true;
  }

  /**
   * Revoke all tokens for a user (e.g., on password change or account deletion)
   * Stores a "revoked before" timestamp - any token issued before this time is invalid
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const key = `${USER_TOKENS_PREFIX}${userId}:revoked_before`;
    const revokedAt = Date.now();

    if (this.isRedisAvailable() && this.redisConnection.client) {
      try {
        // Store revocation timestamp with long TTL (30 days)
        await this.redisConnection.client.setex(
          key,
          30 * 24 * 60 * 60,
          revokedAt.toString(),
        );
        this.logger.log(`All tokens revoked for user: ${userId}`, this.context);
        return;
      } catch (error) {
        this.logger.warn(
          `Redis revocation failed, using memory fallback`,
          this.context,
          { error },
        );
      }
    }

    // Fallback: store revocation timestamp in memory
    this.memoryUserRevokedBefore.set(userId, revokedAt);
    // Track expiry in the generic cleanup map
    this.memoryBlacklist.set(
      `${USER_REVOKED_BEFORE_KEY_PREFIX}${userId}`,
      revokedAt + 30 * 24 * 60 * 60 * 1000,
    );
  }

  /**
   * Check if a token was issued before user's revocation timestamp
   */
  async isTokenRevokedForUser(
    userId: string,
    tokenIssuedAt: number,
  ): Promise<boolean> {
    const key = `${USER_TOKENS_PREFIX}${userId}:revoked_before`;

    if (this.isRedisAvailable() && this.redisConnection.client) {
      try {
        const revokedBefore = await this.redisConnection.client.get(key);
        if (!revokedBefore) return false;
        return tokenIssuedAt < parseInt(revokedBefore, 10);
      } catch (error) {
        this.logger.warn(
          `Redis check failed, using memory fallback`,
          this.context,
          { error },
        );
      }
    }

    // Memory fallback
    const revokedBefore = this.memoryUserRevokedBefore.get(userId);
    if (!revokedBefore) return false;
    return tokenIssuedAt < revokedBefore;
  }

  private isRedisAvailable(): boolean {
    return this.redisConnection.isEnabled && !!this.redisConnection.client;
  }

  private cleanupMemoryStore(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, expiryTime] of this.memoryBlacklist) {
      if (now > expiryTime) {
        this.memoryBlacklist.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(
        `Cleaned ${cleaned} expired tokens from memory blacklist`,
        this.context,
      );
    }
  }
}
