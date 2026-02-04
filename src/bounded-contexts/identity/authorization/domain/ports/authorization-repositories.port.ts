/**
 * Authorization Repository Interfaces
 *
 * Port interfaces following Dependency Inversion Principle.
 * Domain services depend on these abstractions, not implementations.
 */

import type { Permission, PermissionId } from '../entities/permission.entity';
import type { Role, RoleId } from '../entities/role.entity';
import type { Group, GroupId } from '../entities/group.entity';
import type { UserId } from '../entities/user-auth-context.entity';

/** User's direct permission assignment */
export interface UserPermissionAssignment {
  permissionId: PermissionId;
  granted: boolean;
  expiresAt?: Date;
}

/** User's role assignment */
export interface UserRoleAssignment {
  roleId: RoleId;
  expiresAt?: Date;
}

/** User's group membership */
export interface UserGroupMembership {
  groupId: GroupId;
  expiresAt?: Date;
}

/** Permission repository port */
export interface IPermissionRepository {
  findById(id: PermissionId): Promise<Permission | null>;
  findByIds(ids: PermissionId[]): Promise<Permission[]>;
  findByKey(resource: string, action: string): Promise<Permission | null>;
}

/** Role repository port */
export interface IRoleRepository {
  findById(id: RoleId): Promise<Role | null>;
  findByIds(ids: RoleId[]): Promise<Role[]>;
  findByName(name: string): Promise<Role | null>;
}

/** Group repository port */
export interface IGroupRepository {
  findById(id: GroupId): Promise<Group | null>;
  findByIds(ids: GroupId[]): Promise<Group[]>;
  findByName(name: string): Promise<Group | null>;
  findAncestors(groupId: GroupId): Promise<Group[]>;
}

/** User authorization repository port */
export interface IUserAuthorizationRepository {
  getUserPermissions(userId: UserId): Promise<UserPermissionAssignment[]>;
  getUserRoles(userId: UserId): Promise<UserRoleAssignment[]>;
  getUserGroups(userId: UserId): Promise<UserGroupMembership[]>;
}
