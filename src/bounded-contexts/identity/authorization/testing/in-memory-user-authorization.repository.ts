import type { PermissionId } from '../domain/entities/permission.entity';
import type { RoleId } from '../domain/entities/role.entity';
import type { UserId } from '../domain/entities/user-auth-context.entity';
import type {
  IUserAuthorizationRepository,
  UserPermissionAssignment,
  UserRoleAssignment,
} from '../domain/ports';

interface AssignOptions {
  expiresAt?: Date;
}

/**
 * In-memory implementation for tests.
 *
 * P0-009: group-related state and methods removed alongside the
 * dropped `Group/UserGroup` schema.
 */
export class InMemoryUserAuthorizationRepository implements IUserAuthorizationRepository {
  private permissions = new Map<UserId, UserPermissionAssignment[]>();
  private roles = new Map<UserId, UserRoleAssignment[]>();

  // ───────────────────────────────────────────────────────────────
  // IUserAuthorizationRepository (read)
  // ───────────────────────────────────────────────────────────────

  async getUserPermissions(userId: UserId): Promise<UserPermissionAssignment[]> {
    return this.permissions.get(userId) ?? [];
  }

  async getUserRoles(userId: UserId): Promise<UserRoleAssignment[]> {
    return this.roles.get(userId) ?? [];
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

  setRoleNameCount(roleName: string, count: number): void {
    this.roleNameCounts.set(roleName.toLowerCase(), count);
  }

  clear(): void {
    this.permissions.clear();
    this.roles.clear();
    this.roleNameCounts.clear();
  }
}
