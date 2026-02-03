/**
 * Permission Resolver Service (Domain Service)
 *
 * Resolves a user's complete authorization context by aggregating
 * permissions from all sources: direct, role, and group (with inheritance).
 *
 * Design Decision: Pure domain service with no infrastructure dependencies.
 * Repositories are injected as port interfaces.
 */

import type { Permission, PermissionId } from '../entities/permission.entity';
import type { Role } from '../entities/role.entity';
import type { Group, GroupId } from '../entities/group.entity';
import {
  UserAuthContext,
  type UserId,
} from '../entities/user-auth-context.entity';
import type {
  IPermissionRepository,
  IRoleRepository,
  IGroupRepository,
  IUserAuthorizationRepository,
} from '../ports/authorization-repositories.port';
import { PermissionCollector } from './permission-collector';

export class PermissionResolverService {
  constructor(
    private readonly permissionRepo: IPermissionRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly groupRepo: IGroupRepository,
    private readonly userAuthRepo: IUserAuthorizationRepository,
  ) {}

  async resolveUserContext(userId: UserId): Promise<UserAuthContext> {
    const [userPermissions, userRoles, userGroups] = await Promise.all([
      this.userAuthRepo.getUserPermissions(userId),
      this.userAuthRepo.getUserRoles(userId),
      this.userAuthRepo.getUserGroups(userId),
    ]);

    const now = new Date();
    const activePermissions = userPermissions.filter(
      (p) => !p.expiresAt || p.expiresAt > now,
    );
    const activeRoles = userRoles.filter(
      (r) => !r.expiresAt || r.expiresAt > now,
    );
    const activeGroups = userGroups.filter(
      (g) => !g.expiresAt || g.expiresAt > now,
    );

    const roleIds = activeRoles.map((r) => r.roleId);
    const groupIds = activeGroups.map((g) => g.groupId);

    const [roles, groups] = await Promise.all([
      this.roleRepo.findByIds(roleIds),
      this.groupRepo.findByIds(groupIds),
    ]);

    const allGroupIds = new Set(groupIds);
    const ancestorGroups = await this.resolveGroupAncestors(groups);
    for (const group of ancestorGroups) allGroupIds.add(group.id);

    const collector = new PermissionCollector();
    this.collectDirectPermissions(collector, activePermissions, userId);
    this.collectRolePermissions(collector, roles);
    this.collectGroupPermissions(
      collector,
      [...groups, ...ancestorGroups],
      groupIds,
      roles,
    );

    const permissionIds = collector.getAllPermissionIds();
    const permissions = await this.permissionRepo.findByIds(permissionIds);
    const permissionMap = new Map<PermissionId, Permission>(
      permissions.map((p) => [p.id, p]),
    );
    const resolvedPermissions = collector.resolve(permissionMap);

    return UserAuthContext.create({
      userId,
      roleIds,
      groupIds: Array.from(allGroupIds),
      permissions: resolvedPermissions,
    });
  }

  async hasPermission(
    userId: UserId,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const directResult = await this.checkDirectPermission(
      userId,
      resource,
      action,
    );
    if (directResult !== null) return directResult;
    const context = await this.resolveUserContext(userId);
    return context.hasPermission(resource, action);
  }

  private collectDirectPermissions(
    collector: PermissionCollector,
    permissions: { permissionId: PermissionId; granted: boolean }[],
    userId: string,
  ): void {
    for (const p of permissions)
      collector.addDirect(p.permissionId, p.granted, userId);
  }

  private collectRolePermissions(
    collector: PermissionCollector,
    roles: Role[],
  ): void {
    for (const role of roles) {
      for (const permissionId of role.permissionIds) {
        collector.addFromRole(permissionId, role.id, role.displayName);
      }
    }
  }

  private collectGroupPermissions(
    collector: PermissionCollector,
    allGroups: Group[],
    directGroupIds: GroupId[],
    roles: Role[],
  ): void {
    for (const group of allGroups) {
      const isInherited = !directGroupIds.includes(group.id);
      for (const permissionId of group.permissionIds) {
        collector.addFromGroup(
          permissionId,
          group.id,
          group.displayName,
          isInherited,
        );
      }
      for (const roleId of group.roleIds) {
        const groupRole = roles.find((r) => r.id === roleId);
        if (groupRole) {
          for (const permissionId of groupRole.permissionIds) {
            collector.addFromGroup(
              permissionId,
              group.id,
              `${group.displayName} → ${groupRole.displayName}`,
              isInherited,
            );
          }
        }
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
      (p) =>
        p.permissionId === permission.id &&
        (!p.expiresAt || p.expiresAt > new Date()),
    );
    return assignment ? assignment.granted : null;
  }

  private async resolveGroupAncestors(groups: Group[]): Promise<Group[]> {
    const ancestors: Group[] = [];
    const visited = new Set<GroupId>();
    for (const group of groups) {
      if (group.parentId && !visited.has(group.parentId)) {
        const groupAncestors = await this.groupRepo.findAncestors(group.id);
        for (const ancestor of groupAncestors) {
          if (!visited.has(ancestor.id)) {
            visited.add(ancestor.id);
            ancestors.push(ancestor);
          }
        }
      }
    }
    return ancestors;
  }
}
