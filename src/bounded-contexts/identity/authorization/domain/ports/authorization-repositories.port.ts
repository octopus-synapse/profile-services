/**
 * Authorization Lookup Repository Interfaces
 *
 * Per-entity read ports following Dependency Inversion Principle.
 * Domain services depend on these abstractions, not implementations.
 *
 * User-scoped role/group/permission mutations live in
 * `user-authorization.port.ts` so this file stays within the ISP budget.
 */

import type { Group, GroupId } from '../entities/group.entity';
import type { Permission, PermissionId } from '../entities/permission.entity';
import type { Role, RoleId } from '../entities/role.entity';

/** Re-exported so callers importing the user-scoped port from this file
 * keep working during the split. New code should import directly from
 * `user-authorization.port.ts`. */
export type {
  IUserAuthorizationRepository,
  UserGroupMembership,
  UserPermissionAssignment,
  UserRoleAssignment,
} from './user-authorization.port';

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
