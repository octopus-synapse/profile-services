/**
 * User Authorization Repository Port
 *
 * Carries the user-scoped read + write operations for the authorization
 * aggregate (role/group/permission assignments). Kept in its own port so
 * the per-entity lookup repositories (Permission / Role / Group) stay on
 * a file that fits the ISP <=15 methods budget.
 */

import type { GroupId } from '../entities/group.entity';
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

export interface UserGroupMembership {
  groupId: GroupId;
  expiresAt?: Date;
}

export interface IUserAuthorizationRepository {
  getUserPermissions(userId: UserId): Promise<UserPermissionAssignment[]>;
  getUserRoles(userId: UserId): Promise<UserRoleAssignment[]>;
  getUserGroups(userId: UserId): Promise<UserGroupMembership[]>;

  assignRole(
    userId: UserId,
    roleId: RoleId,
    options?: { assignedBy?: string; expiresAt?: Date },
  ): Promise<void>;
  revokeRole(userId: UserId, roleId: RoleId): Promise<void>;

  addToGroup(
    userId: UserId,
    groupId: GroupId,
    options?: { assignedBy?: string; expiresAt?: Date },
  ): Promise<void>;
  removeFromGroup(userId: UserId, groupId: GroupId): Promise<void>;

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
