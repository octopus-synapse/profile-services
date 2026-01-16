/**
 * Permission Resolver Service (Domain Service)
 *
 * Core domain service responsible for resolving a user's complete
 * authorization context by aggregating permissions from all sources.
 *
 * Single Responsibility: Resolve permissions from multiple sources
 * into a unified authorization context.
 *
 * Design Decision: This is a DOMAIN SERVICE, not an application service.
 * It contains pure business logic with no infrastructure dependencies.
 * Repositories are injected as interfaces.
 *
 * Permission Resolution Order:
 * 1. Direct user permissions (highest priority, can deny)
 * 2. Role permissions
 * 3. Group permissions (direct)
 * 4. Inherited group permissions (from parent groups)
 *
 * Explicit denials always win over grants.
 */

import type { Permission, PermissionId } from '../entities/permission.entity';
import type { Role, RoleId } from '../entities/role.entity';
import type { Group, GroupId } from '../entities/group.entity';
import {
  UserAuthContext,
  type UserId,
  type ResolvedPermission,
  type PermissionSource,
} from '../entities/user-auth-context.entity';

// ============================================================================
// Repository Interfaces (Dependency Inversion)
// ============================================================================

/**
 * User's direct permission assignment
 */
export interface UserPermissionAssignment {
  permissionId: PermissionId;
  granted: boolean;
  expiresAt?: Date;
}

/**
 * User's role assignment
 */
export interface UserRoleAssignment {
  roleId: RoleId;
  expiresAt?: Date;
}

/**
 * User's group membership
 */
export interface UserGroupMembership {
  groupId: GroupId;
  expiresAt?: Date;
}

/**
 * Repository interface for permission resolution
 * Following Dependency Inversion Principle
 */
export interface IPermissionRepository {
  findById(id: PermissionId): Promise<Permission | null>;
  findByIds(ids: PermissionId[]): Promise<Permission[]>;
  findByKey(resource: string, action: string): Promise<Permission | null>;
}

export interface IRoleRepository {
  findById(id: RoleId): Promise<Role | null>;
  findByIds(ids: RoleId[]): Promise<Role[]>;
  findByName(name: string): Promise<Role | null>;
}

export interface IGroupRepository {
  findById(id: GroupId): Promise<Group | null>;
  findByIds(ids: GroupId[]): Promise<Group[]>;
  findByName(name: string): Promise<Group | null>;
  findAncestors(groupId: GroupId): Promise<Group[]>;
}

export interface IUserAuthorizationRepository {
  getUserPermissions(userId: UserId): Promise<UserPermissionAssignment[]>;
  getUserRoles(userId: UserId): Promise<UserRoleAssignment[]>;
  getUserGroups(userId: UserId): Promise<UserGroupMembership[]>;
}

// ============================================================================
// Permission Resolver Service
// ============================================================================

export class PermissionResolverService {
  constructor(
    private readonly permissionRepo: IPermissionRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly groupRepo: IGroupRepository,
    private readonly userAuthRepo: IUserAuthorizationRepository,
  ) {}

  /**
   * Resolve complete authorization context for a user
   */
  async resolveUserContext(userId: UserId): Promise<UserAuthContext> {
    // Collect all permission data in parallel
    const [userPermissions, userRoles, userGroups] = await Promise.all([
      this.userAuthRepo.getUserPermissions(userId),
      this.userAuthRepo.getUserRoles(userId),
      this.userAuthRepo.getUserGroups(userId),
    ]);

    // Filter out expired assignments
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

    // Resolve roles and groups
    const roleIds = activeRoles.map((r) => r.roleId);
    const groupIds = activeGroups.map((g) => g.groupId);

    const [roles, groups] = await Promise.all([
      this.roleRepo.findByIds(roleIds),
      this.groupRepo.findByIds(groupIds),
    ]);

    // Get all ancestor groups for inheritance
    const allGroupIds = new Set(groupIds);
    const ancestorGroups = await this.resolveGroupAncestors(groups);

    for (const group of ancestorGroups) {
      allGroupIds.add(group.id);
    }

    // Collect all permission IDs
    const permissionCollector = new PermissionCollector();

    // 1. Direct user permissions (highest priority)
    for (const assignment of activePermissions) {
      permissionCollector.addDirect(
        assignment.permissionId,
        assignment.granted,
        userId,
      );
    }

    // 2. Role permissions
    for (const role of roles) {
      for (const permissionId of role.permissionIds) {
        permissionCollector.addFromRole(
          permissionId,
          role.id,
          role.displayName,
        );
      }
    }

    // 3. Direct group permissions + inherited from ancestors
    const allGroups = [...groups, ...ancestorGroups];
    for (const group of allGroups) {
      const isInherited = !groupIds.includes(group.id);

      // Group's direct permissions
      for (const permissionId of group.permissionIds) {
        permissionCollector.addFromGroup(
          permissionId,
          group.id,
          group.displayName,
          isInherited,
        );
      }

      // Group's role permissions
      for (const roleId of group.roleIds) {
        const groupRole = roles.find((r) => r.id === roleId);
        if (groupRole) {
          for (const permissionId of groupRole.permissionIds) {
            permissionCollector.addFromGroup(
              permissionId,
              group.id,
              `${group.displayName} → ${groupRole.displayName}`,
              isInherited,
            );
          }
        }
      }
    }

    // Resolve all permissions
    const permissionIds = permissionCollector.getAllPermissionIds();
    const permissions = await this.permissionRepo.findByIds(permissionIds);
    const permissionMap = new Map(permissions.map((p) => [p.id, p]));

    // Build resolved permissions
    const resolvedPermissions = permissionCollector.resolve(permissionMap);

    return UserAuthContext.create({
      userId,
      roleIds,
      groupIds: Array.from(allGroupIds),
      permissions: resolvedPermissions,
    });
  }

  /**
   * Quick permission check without building full context
   * Optimized for single permission checks
   */
  async hasPermission(
    userId: UserId,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // First check direct user permission (fastest path for denials)
    const directPermission = await this.checkDirectPermission(
      userId,
      resource,
      action,
    );
    if (directPermission !== null) {
      return directPermission;
    }

    // Build full context and check
    const context = await this.resolveUserContext(userId);
    return context.hasPermission(resource, action);
  }

  /**
   * Check direct user permission (for quick denial checks)
   */
  private async checkDirectPermission(
    userId: UserId,
    resource: string,
    action: string,
  ): Promise<boolean | null> {
    const userPermissions = await this.userAuthRepo.getUserPermissions(userId);
    const permission = await this.permissionRepo.findByKey(resource, action);

    if (!permission) {
      return null;
    }

    const directAssignment = userPermissions.find(
      (p) =>
        p.permissionId === permission.id &&
        (!p.expiresAt || p.expiresAt > new Date()),
    );

    if (directAssignment) {
      return directAssignment.granted;
    }

    return null;
  }

  /**
   * Resolve all ancestor groups for inheritance
   */
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

// ============================================================================
// Permission Collector (Helper Class)
// ============================================================================

interface PermissionEntry {
  sources: PermissionSource[];
  granted: boolean;
  hasDenial: boolean;
}

class PermissionCollector {
  private entries = new Map<PermissionId, PermissionEntry>();

  addDirect(
    permissionId: PermissionId,
    granted: boolean,
    userId: string,
  ): void {
    const entry = this.getOrCreate(permissionId);

    entry.sources.push({
      type: 'direct',
      sourceId: userId,
      sourceName: 'Direct Assignment',
      inherited: false,
    });

    // Direct denials always win
    if (!granted) {
      entry.hasDenial = true;
      entry.granted = false;
    } else if (!entry.hasDenial) {
      entry.granted = true;
    }
  }

  addFromRole(
    permissionId: PermissionId,
    roleId: RoleId,
    roleName: string,
  ): void {
    const entry = this.getOrCreate(permissionId);

    entry.sources.push({
      type: 'role',
      sourceId: roleId,
      sourceName: roleName,
      inherited: false,
    });

    if (!entry.hasDenial) {
      entry.granted = true;
    }
  }

  addFromGroup(
    permissionId: PermissionId,
    groupId: GroupId,
    groupName: string,
    inherited: boolean,
  ): void {
    const entry = this.getOrCreate(permissionId);

    entry.sources.push({
      type: 'group',
      sourceId: groupId,
      sourceName: groupName,
      inherited,
    });

    if (!entry.hasDenial) {
      entry.granted = true;
    }
  }

  getAllPermissionIds(): PermissionId[] {
    return Array.from(this.entries.keys());
  }

  resolve(permissionMap: Map<PermissionId, Permission>): ResolvedPermission[] {
    const resolved: ResolvedPermission[] = [];

    for (const [permissionId, entry] of this.entries) {
      const permission = permissionMap.get(permissionId);
      if (permission) {
        resolved.push({
          permission,
          sources: entry.sources,
          granted: entry.granted,
        });
      }
    }

    return resolved;
  }

  private getOrCreate(permissionId: PermissionId): PermissionEntry {
    let entry = this.entries.get(permissionId);
    if (!entry) {
      entry = {
        sources: [],
        granted: false,
        hasDenial: false,
      };
      this.entries.set(permissionId, entry);
    }
    return entry;
  }
}
