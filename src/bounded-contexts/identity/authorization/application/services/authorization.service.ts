import { CACHE_PRESETS } from '@/shared-kernel/cache/cache-ttl.const';
import type { UserId } from '../../domain/entities/user-auth-context.entity';
import { UserAuthContext } from '../../domain/entities/user-auth-context.entity';
import type { IRoleRepository } from '../../domain/ports/authorization-repositories.port';
import type { PermissionResolverService } from '../../domain/services/permission-resolver.service';
import { AuthorizationContextCachePort } from '../ports/authorization-context-cache.port';
import { AuthorizationServicePort } from '../ports/authorization-service.port';

const DEFAULT_CACHE_TTL_MS = CACHE_PRESETS.EPHEMERAL * 1000;

export class AuthorizationService extends AuthorizationServicePort {
  constructor(
    private readonly resolver: PermissionResolverService,
    private readonly cache: AuthorizationContextCachePort,
    private readonly roleRepo: IRoleRepository,
    private readonly userAuthRepo: { countUsersWithRoleName(roleName: string): Promise<number> },
    private readonly cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
  ) {
    super();
  }

  async hasPermission(userId: UserId, resource: string, action: string): Promise<boolean> {
    const context = await this.getContext(userId);
    return context.hasPermission(resource, action);
  }

  async hasAnyPermission(
    userId: UserId,
    permissions: ReadonlyArray<{ resource: string; action: string }>,
  ): Promise<boolean> {
    const context = await this.getContext(userId);
    return context.hasAnyPermission([...permissions]);
  }

  async hasAllPermissions(
    userId: UserId,
    permissions: ReadonlyArray<{ resource: string; action: string }>,
  ): Promise<boolean> {
    const context = await this.getContext(userId);
    return context.hasAllPermissions([...permissions]);
  }

  async getContext(userId: UserId): Promise<UserAuthContext> {
    const cached = await this.cache.get(userId);
    if (cached) return cached;

    const context = await this.resolver.resolveUserContext(userId);
    await this.cache.set(userId, context, this.cacheTtlMs);
    return context;
  }

  invalidateCache(userId: UserId): void {
    void this.cache.invalidate(userId);
  }

  invalidateAllCaches(): void {
    void this.cache.invalidateAll();
  }

  async getResourcePermissions(userId: UserId, resource: string): Promise<string[]> {
    const context = await this.getContext(userId);
    return context.getResourcePermissions(resource).map((p) => p.permission.action);
  }

  async getAllPermissions(userId: UserId): Promise<string[]> {
    const context = await this.getContext(userId);
    return context.grantedPermissionKeys;
  }

  async hasRole(userId: UserId, roleIdOrName: string): Promise<boolean> {
    const context = await this.getContext(userId);
    if (context.hasRole(roleIdOrName)) return true;

    const role = await this.roleRepo.findByName(roleIdOrName);
    if (role) return context.hasRole(role.id);
    return false;
  }

  async countUsersWithRole(roleName: string): Promise<number> {
    return this.userAuthRepo.countUsersWithRoleName(roleName);
  }

  async isLastAdmin(userId: UserId): Promise<boolean> {
    const isAdmin = await this.hasRole(userId, 'admin');
    if (!isAdmin) return false;
    const adminCount = await this.countUsersWithRole('admin');
    return adminCount <= 1;
  }
}
