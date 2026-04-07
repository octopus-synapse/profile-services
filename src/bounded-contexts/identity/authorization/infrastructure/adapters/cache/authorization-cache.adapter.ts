/**
 * In-Memory Authorization Cache Adapter
 *
 * Implements AuthorizationCachePort with TTL-based expiration
 * and LRU-like eviction.
 */

import type { UserAuthContext } from '../../../domain/entities/user-auth-context.entity';
import type { UserId } from '../../../domain/entities/user-auth-context.entity';
import type { AuthorizationCachePort } from '../../../domain/ports/authorization-cache.port';

const DEFAULT_CACHE_TTL_SECONDS = 60; // 1 minute
const MAX_CACHE_SIZE = 1000;

interface CacheEntry {
  context: UserAuthContext;
  expiresAt: number;
}

export class InMemoryAuthorizationCache implements AuthorizationCachePort {
  private readonly cache = new Map<UserId, CacheEntry>();

  get(userId: UserId): UserAuthContext | null {
    const cached = this.cache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.context;
    }
    return null;
  }

  set(userId: UserId, context: UserAuthContext): void {
    // Enforce max cache size (LRU-like eviction)
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value as UserId | undefined;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(userId, {
      context,
      expiresAt: Date.now() + DEFAULT_CACHE_TTL_SECONDS * 1000,
    });
  }

  invalidate(userId: UserId): void {
    this.cache.delete(userId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
    };
  }
}
