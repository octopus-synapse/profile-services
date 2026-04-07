import type { GroupId } from '../domain/entities/group.entity';
import type { PermissionId } from '../domain/entities/permission.entity';
import type { RoleId } from '../domain/entities/role.entity';
import type { UserId } from '../domain/entities/user-auth-context.entity';
import type {
  IUserAuthorizationRepository,
  UserGroupMembership,
  UserPermissionAssignment,
  UserRoleAssignment,
} from '../domain/ports';

interface AssignOptions {
  expiresAt?: Date;
}

export class InMemoryUserAuthorizationRepository implements IUserAuthorizationRepository {
  private permissions = new Map<UserId, UserPermissionAssignment[]>();
  private roles = new Map<UserId, UserRoleAssignment[]>();
  private groups = new Map<UserId, UserGroupMembership[]>();

  // ───────────────────────────────────────────────────────────────
  // IUserAuthorizationRepository (read)
  // ───────────────────────────────────────────────────────────────

  async getUserPermissions(userId: UserId): Promise<UserPermissionAssignment[]> {
    return this.permissions.get(userId) ?? [];
  }

  async getUserRoles(userId: UserId): Promise<UserRoleAssignment[]> {
    return this.roles.get(userId) ?? [];
  }

  async getUserGroups(userId: UserId): Promise<UserGroupMembership[]> {
    return this.groups.get(userId) ?? [];
  }

  // ───────────────────────────────────────────────────────────────
  // Write operations (match concrete UserAuthorizationRepository)
  // ───────────────────────────────────────────────────────────────

  async assignRole(userId: UserId, roleId: RoleId, options?: AssignOptions): Promise<void> {
    const userRoles = this.roles.get(userId) ?? [];
    const existing = userRoles.findIndex((r) => r.roleId === roleId);
    if (existing >= 0) {
      userRoles[existing] = { roleId, expiresAt: options?.expiresAt };
    } else {
      userRoles.push({ roleId, expiresAt: options?.expiresAt });
    }
    this.roles.set(userId, userRoles);
  }

  async revokeRole(userId: UserId, roleId: RoleId): Promise<void> {
    const userRoles = this.roles.get(userId) ?? [];
    this.roles.set(
      userId,
      userRoles.filter((r) => r.roleId !== roleId),
    );
  }

  async setRoles(userId: UserId, roleIds: RoleId[], options?: AssignOptions): Promise<void> {
    this.roles.set(
      userId,
      roleIds.map((roleId) => ({ roleId, expiresAt: options?.expiresAt })),
    );
  }

  async addToGroup(userId: UserId, groupId: GroupId, options?: AssignOptions): Promise<void> {
    const userGroups = this.groups.get(userId) ?? [];
    const existing = userGroups.findIndex((g) => g.groupId === groupId);
    if (existing >= 0) {
      userGroups[existing] = { groupId, expiresAt: options?.expiresAt };
    } else {
      userGroups.push({ groupId, expiresAt: options?.expiresAt });
    }
    this.groups.set(userId, userGroups);
  }

  async removeFromGroup(userId: UserId, groupId: GroupId): Promise<void> {
    const userGroups = this.groups.get(userId) ?? [];
    this.groups.set(
      userId,
      userGroups.filter((g) => g.groupId !== groupId),
    );
  }

  async setGroups(userId: UserId, groupIds: GroupId[], options?: AssignOptions): Promise<void> {
    this.groups.set(
      userId,
      groupIds.map((groupId) => ({ groupId, expiresAt: options?.expiresAt })),
    );
  }

  async grantPermission(
    userId: UserId,
    permissionId: PermissionId,
    options?: AssignOptions,
  ): Promise<void> {
    const userPerms = this.permissions.get(userId) ?? [];
    const existing = userPerms.findIndex((p) => p.permissionId === permissionId);
    if (existing >= 0) {
      userPerms[existing] = { permissionId, granted: true, expiresAt: options?.expiresAt };
    } else {
      userPerms.push({ permissionId, granted: true, expiresAt: options?.expiresAt });
    }
    this.permissions.set(userId, userPerms);
  }

  async denyPermission(
    userId: UserId,
    permissionId: PermissionId,
    options?: AssignOptions,
  ): Promise<void> {
    const userPerms = this.permissions.get(userId) ?? [];
    const existing = userPerms.findIndex((p) => p.permissionId === permissionId);
    if (existing >= 0) {
      userPerms[existing] = { permissionId, granted: false, expiresAt: options?.expiresAt };
    } else {
      userPerms.push({ permissionId, granted: false, expiresAt: options?.expiresAt });
    }
    this.permissions.set(userId, userPerms);
  }

  async removeDirectPermission(userId: UserId, permissionId: PermissionId): Promise<void> {
    const userPerms = this.permissions.get(userId) ?? [];
    this.permissions.set(
      userId,
      userPerms.filter((p) => p.permissionId !== permissionId),
    );
  }

  async getUsersWithRole(roleId: RoleId): Promise<UserId[]> {
    const result: UserId[] = [];
    for (const [userId, userRoles] of this.roles.entries()) {
      if (userRoles.some((r) => r.roleId === roleId)) {
        result.push(userId);
      }
    }
    return result;
  }

  async countUsersWithRole(roleId: RoleId): Promise<number> {
    return (await this.getUsersWithRole(roleId)).length;
  }

  async countUsersWithRoleName(roleName: string): Promise<number> {
    // Requires external role lookup — use roleNameCounts for testing
    return this.roleNameCounts.get(roleName.toLowerCase()) ?? 0;
  }

  async getUsersInGroup(groupId: GroupId): Promise<UserId[]> {
    const result: UserId[] = [];
    for (const [userId, userGroups] of this.groups.entries()) {
      if (userGroups.some((g) => g.groupId === groupId)) {
        result.push(userId);
      }
    }
    return result;
  }

  async cleanupExpiredAssignments(): Promise<void> {
    const now = new Date();
    for (const [userId, perms] of this.permissions.entries()) {
      this.permissions.set(
        userId,
        perms.filter((p) => !p.expiresAt || p.expiresAt > now),
      );
    }
    for (const [userId, userRoles] of this.roles.entries()) {
      this.roles.set(
        userId,
        userRoles.filter((r) => !r.expiresAt || r.expiresAt > now),
      );
    }
    for (const [userId, userGroups] of this.groups.entries()) {
      this.groups.set(
        userId,
        userGroups.filter((g) => !g.expiresAt || g.expiresAt > now),
      );
    }
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  private roleNameCounts = new Map<string, number>();

  seedPermission(userId: UserId, assignment: UserPermissionAssignment): void {
    const perms = this.permissions.get(userId) ?? [];
    perms.push(assignment);
    this.permissions.set(userId, perms);
  }

  seedRole(userId: UserId, assignment: UserRoleAssignment): void {
    const userRoles = this.roles.get(userId) ?? [];
    userRoles.push(assignment);
    this.roles.set(userId, userRoles);
  }

  seedGroup(userId: UserId, membership: UserGroupMembership): void {
    const userGroups = this.groups.get(userId) ?? [];
    userGroups.push(membership);
    this.groups.set(userId, userGroups);
  }

  setRoleNameCount(roleName: string, count: number): void {
    this.roleNameCounts.set(roleName.toLowerCase(), count);
  }

  clear(): void {
    this.permissions.clear();
    this.roles.clear();
    this.groups.clear();
    this.roleNameCounts.clear();
  }
}
