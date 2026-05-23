/**
 * Permission Resolver Service (Domain Service)
 *
 * Resolves a user's complete authorization context by aggregating
 * permissions from all sources: direct user assignments and roles.
 *
 * P0-009: the legacy Group/UserGroup hierarchy was removed in the
 * `20260430040810_authz_refactor` migration. Per-user grants and
 * suspensions that previously rode on group membership now flow
 * through `AccessModifier` (consulted at request time by the
 * permission gate stage in the Elysia pipeline).
 *
 * Design Decision: Pure domain service with no infrastructure
 * dependencies. Repositories are injected as port interfaces.
 */

import type { Permission, PermissionId } from '../entities/permission.entity';
import type { Role } from '../entities/role.entity';
import { UserAuthContext, type UserId } from '../entities/user-auth-context.entity';
import type {
  IPermissionRepository,
  IRoleRepository,
  IUserAuthorizationRepository,
} from '../ports/authorization-repositories.port';
import { PermissionCollector } from './permission-collector';

export class PermissionResolverService {
  constructor(
    private readonly permissionRepo: IPermissionRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly userAuthRepo: IUserAuthorizationRepository,
  ) {}

  async resolveUserContext(userId: UserId): Promise<UserAuthContext> {
    const [userPermissions, userRoles] = await Promise.all([
      this.userAuthRepo.getUserPermissions(userId),
      this.userAuthRepo.getUserRoles(userId),
    ]);

    const now = new Date();
    const activePermissions = userPermissions.filter((p) => !p.expiresAt || p.expiresAt > now);
    const activeRoles = userRoles.filter((r) => !r.expiresAt || r.expiresAt > now);

    const roleIds = activeRoles.map((r) => r.roleId);
    const roles = await this.roleRepo.findByIds(roleIds);

    const collector = new PermissionCollector();
    this.collectDirectPermissions(collector, activePermissions, userId);
    this.collectRolePermissions(collector, roles);

    const permissionIds = collector.getAllPermissionIds();
    const permissions = await this.permissionRepo.findByIds(permissionIds);
    const permissionMap = new Map<PermissionId, Permission>(permissions.map((p) => [p.id, p]));
    const resolvedPermissions = collector.resolve(permissionMap);

    return UserAuthContext.create({
      userId,
      roleIds,
      groupIds: [],
      permissions: resolvedPermissions,
    });
  }

  async hasPermission(userId: UserId, resource: string, action: string): Promise<boolean> {
    const directResult = await this.checkDirectPermission(userId, resource, action);
    if (directResult !== null) return directResult;
    const context = await this.resolveUserContext(userId);
    return context.hasPermission(resource, action);
  }

  private collectDirectPermissions(
    collector: PermissionCollector,
    permissions: { permissionId: PermissionId; granted: boolean }[],
    userId: string,
  ): void {
    for (const p of permissions) collector.addDirect(p.permissionId, p.granted, userId);
  }

  private collectRolePermissions(collector: PermissionCollector, roles: Role[]): void {
    for (const role of roles) {
      for (const permissionId of role.permissionIds) {
        collector.addFromRole(permissionId, role.id, role.displayName);
      }
    }
  }

  private async checkDirectPermission(
    userId: UserId,
    resource: string,
    action: string,
  ): Promise<boolean | null> {
    const userPermissions = await this.userAuthRepo.getUserPermissions(userId);
    const permission = await this.permissionRepo.findByKey(resource, action);
    if (!permission) return null;
    const assignment = userPermissions.find(
      (p) => p.permissionId === permission.id && (!p.expiresAt || p.expiresAt > new Date()),
    );
    return assignment ? assignment.granted : null;
  }
}
