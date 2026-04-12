/**
 * Get Auth Context Use Case
 *
 * Resolves and caches a user's complete authorization context.
 * This is the foundation use case that other permission checks depend on.
 */

import type { UserAuthContext, UserId } from '../../../domain/entities/user-auth-context.entity';
import type { AuthorizationCachePort } from '../../../domain/ports/authorization-cache.port';
import type { PermissionResolverService } from '../../../domain/services/permission-resolver.service';

export class GetAuthContextUseCase {
  constructor(
    private readonly resolver: PermissionResolverService,
    private readonly cache: AuthorizationCachePort,
  ) {}

  async execute(userId: UserId): Promise<UserAuthContext> {
    const cached = this.cache.get(userId);
    if (cached) {
      return cached;
    }

    const context = await this.resolver.resolveUserContext(userId);
    this.cache.set(userId, context);

    return context;
  }
}
