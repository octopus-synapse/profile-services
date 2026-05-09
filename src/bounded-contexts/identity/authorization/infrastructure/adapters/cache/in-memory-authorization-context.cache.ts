import { AuthorizationContextCachePort } from '../../../application/ports/authorization-context-cache.port';
import type { UserAuthContext, UserId } from '../../../domain/entities/user-auth-context.entity';

interface CacheEntry {
  context: UserAuthContext;
  expiresAt: number;
}

const DEFAULT_MAX_SIZE = 1000;

export class InMemoryAuthorizationContextCache extends AuthorizationContextCachePort {
  private readonly cache = new Map<UserId, CacheEntry>();

  constructor(private readonly maxSize: number = DEFAULT_MAX_SIZE) {
    super();
  }

  async get(userId: UserId): Promise<UserAuthContext | null> {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(userId);
      return null;
    }
    return entry.context;
  }

  async set(userId: UserId, context: UserAuthContext, ttlMs: number): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value as UserId | undefined;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(userId, { context, expiresAt: Date.now() + ttlMs });
  }

  async invalidate(userId: UserId): Promise<void> {
    this.cache.delete(userId);
  }

  async invalidateAll(): Promise<void> {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
