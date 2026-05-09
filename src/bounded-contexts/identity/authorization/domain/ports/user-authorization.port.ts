/**
 * User Authorization Repository Port
 *
 * Carries the user-scoped read + write operations for the authorization
 * aggregate (role/permission assignments). Kept in its own port so
 * the per-entity lookup repositories (Permission / Role) stay on
 * a file that fits the ISP <=15 methods budget.
 *
 * P0-009: the legacy Group hierarchy (`Group`, `UserGroup`, `GroupRole`,
 * `GroupPermission`, `UserPermission`) was removed by the
 * `20260430040810_authz_refactor` migration in favor of `AccessModifier`.
 * Group-scoped methods (`addToGroup`, `removeFromGroup`, `getUserGroups`)
 * have been deleted along with their callers — invoking them on a
 * deployed instance after the migration would crash with
 * `Unknown table 'Group'`.
 */

import type { PermissionId } from '../entities/permission.entity';
import type { RoleId } from '../entities/role.entity';
import type { UserId } from '../entities/user-auth-context.entity';

export interface UserPermissionAssignment {
  permissionId: PermissionId;
  granted: boolean;
  expiresAt?: Date;
}

export interface UserRoleAssignment {
  roleId: RoleId;
  expiresAt?: Date;
}

export interface IUserAuthorizationRepository {
  getUserPermissions(userId: UserId): Promise<UserPermissionAssignment[]>;
  getUserRoles(userId: UserId): Promise<UserRoleAssignment[]>;

  assignRole(
    userId: UserId,
    roleId: RoleId,
    options?: { assignedBy?: string; expiresAt?: Date },
  ): Promise<void>;
  revokeRole(userId: UserId, roleId: RoleId): Promise<void>;

  grantPermission(
    userId: UserId,
    permissionId: PermissionId,
    options?: { assignedBy?: string; expiresAt?: Date; reason?: string },
  ): Promise<void>;
  denyPermission(
    userId: UserId,
    permissionId: PermissionId,
    options?: { assignedBy?: string; expiresAt?: Date; reason?: string },
  ): Promise<void>;

  countUsersWithRoleName(roleName: string): Promise<number>;
}
