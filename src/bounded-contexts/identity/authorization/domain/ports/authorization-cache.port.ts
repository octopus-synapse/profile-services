/**
 * Authorization Cache Port
 *
 * Abstraction for caching user authorization contexts.
 * Enables different cache implementations (in-memory, Redis, etc.).
 */

import type { UserAuthContext } from '../entities/user-auth-context.entity';
import type { UserId } from '../entities/user-auth-context.entity';

export interface AuthorizationCachePort {
  get(userId: UserId): UserAuthContext | null;
  set(userId: UserId, context: UserAuthContext): void;
  invalidate(userId: UserId): void;
  invalidateAll(): void;
  getStats(): { size: number; maxSize: number };
}
