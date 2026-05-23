import type { UserAuthContext, UserId } from '../../domain/entities/user-auth-context.entity';

export abstract class AuthorizationContextCachePort {
  abstract get(userId: UserId): Promise<UserAuthContext | null>;
  abstract set(userId: UserId, context: UserAuthContext, ttlMs: number): Promise<void>;
  abstract invalidate(userId: UserId): Promise<void>;
  abstract invalidateAll(): Promise<void>;
}
