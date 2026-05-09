import type { LoggerPort } from '@/shared-kernel';
import { AuthorizationContextCachePort } from '../../../application/ports/authorization-context-cache.port';
import {
  UserAuthContext,
  type UserAuthContextCacheBlob,
  type UserId,
} from '../../../domain/entities/user-auth-context.entity';

const KEY_PREFIX = 'authz:ctx:';
const INVALIDATE_ALL_PATTERN = `${KEY_PREFIX}*`;
const SCAN_BATCH_SIZE = 200;

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  scan(
    cursor: string | number,
    ...args: Array<string | number>
  ): Promise<[string, string[]] | unknown>;
}

export class RedisAuthorizationContextCache extends AuthorizationContextCachePort {
  constructor(
    private readonly redis: RedisLike,
    private readonly logger?: LoggerPort,
  ) {
    super();
  }

  private keyOf(userId: UserId): string {
    return `${KEY_PREFIX}${userId}`;
  }

  async get(userId: UserId): Promise<UserAuthContext | null> {
    try {
      const raw = await this.redis.get(this.keyOf(userId));
      if (!raw) return null;
      const blob = JSON.parse(raw) as UserAuthContextCacheBlob;
      return UserAuthContext.fromCacheBlob(blob);
    } catch (err) {
      if (this.logger) {
        this.logger.warn(
          `RedisAuthorizationContextCache.get failed for ${userId}: ${(err as Error).message}`,
          'RedisAuthorizationContextCache',
        );
      }
      return null;
    }
  }

  async set(userId: UserId, context: UserAuthContext, ttlMs: number): Promise<void> {
    try {
      const blob = JSON.stringify(context.toCacheBlob());
      await this.redis.set(this.keyOf(userId), blob, 'PX', Math.max(1, Math.floor(ttlMs)));
    } catch (err) {
      if (this.logger) {
        this.logger.warn(
          `RedisAuthorizationContextCache.set failed for ${userId}: ${(err as Error).message}`,
          'RedisAuthorizationContextCache',
        );
      }
    }
  }

  async invalidate(userId: UserId): Promise<void> {
    try {
      await this.redis.del(this.keyOf(userId));
    } catch (err) {
      if (this.logger) {
        this.logger.warn(
          `RedisAuthorizationContextCache.invalidate failed for ${userId}: ${(err as Error).message}`,
          'RedisAuthorizationContextCache',
        );
      }
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      let cursor: string | number = '0';
      do {
        const result = (await this.redis.scan(
          cursor,
          'MATCH',
          INVALIDATE_ALL_PATTERN,
          'COUNT',
          SCAN_BATCH_SIZE,
        )) as [string, string[]];
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) await this.redis.del(...keys);
      } while (cursor !== '0');
    } catch (err) {
      if (this.logger) {
        this.logger.warn(
          `RedisAuthorizationContextCache.invalidateAll failed: ${(err as Error).message}`,
          'RedisAuthorizationContextCache',
        );
      }
    }
  }
}
