import type { UserAuthContext } from '../domain/entities/user-auth-context.entity';
import type { UserId } from '../domain/entities/user-auth-context.entity';
import type { AuthorizationCachePort } from '../domain/ports';

export class InMemoryAuthorizationCache implements AuthorizationCachePort {
  private cache = new Map<UserId, UserAuthContext>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(userId: UserId): UserAuthContext | null {
    return this.cache.get(userId) ?? null;
  }

  set(userId: UserId, context: UserAuthContext): void {
    this.cache.set(userId, context);
  }

  invalidate(userId: UserId): void {
    this.cache.delete(userId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  has(userId: UserId): boolean {
    return this.cache.has(userId);
  }

  clear(): void {
    this.cache.clear();
  }
}
