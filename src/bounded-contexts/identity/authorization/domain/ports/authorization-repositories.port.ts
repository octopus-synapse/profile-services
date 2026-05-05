/**
 * Authorization Lookup Repository Interfaces
 *
 * Per-entity read ports following Dependency Inversion Principle.
 * Domain services depend on these abstractions, not implementations.
 *
 * User-scoped role/permission mutations live in
 * `user-authorization.port.ts` so this file stays within the ISP budget.
 *
 * P0-009: `IGroupRepository` was removed alongside the dropped
 * `Group/UserGroup/GroupPermission/GroupRole` tables — the
 * `20260430040810_authz_refactor` migration replaced the group hierarchy
 * with `AccessModifier`.
 */

import type { Permission, PermissionId } from '../entities/permission.entity';
import type { Role, RoleId } from '../entities/role.entity';

/** Re-exported so callers importing the user-scoped port from this file
 * keep working during the split. New code should import directly from
 * `user-authorization.port.ts`. */
export type {
  IUserAuthorizationRepository,
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
