/**
 * Permission Resolver
 *
 * Pure functions for resolving permissions from roles.
 * No dependencies on NestJS or infrastructure - easily testable.
 *
 * Resolution chain: User.roles → Role.groups → Group.permissions
 */
import { Permission } from './permission.enum';
import { PERMISSION_GROUPS } from './permission-groups';
import { ROLES, type RoleId } from './roles';

/**
 * Resolve all permissions for a set of roles.
 * Returns a Set for O(1) lookup.
 */
export function resolvePermissions(roleIds: readonly string[]): Set<Permission> {
  const permissions = new Set<Permission>();

  for (const roleId of roleIds) {
    const role = Object.values(ROLES).find((r) => r.id === roleId);
    if (!role) continue;

    for (const groupId of role.groups) {
      const group = Object.values(PERMISSION_GROUPS).find((g) => g.id === groupId);
      if (!group) continue;

      for (const permission of group.permissions) {
        permissions.add(permission);
      }
    }
  }

  return permissions;
}

/**
 * Check if roles include a specific permission.
 *
 * Note: ADMIN_FULL_ACCESS bypasses all permission checks.
 */
export function hasPermission(roleIds: readonly string[], permission: Permission): boolean {
  const permissions = resolvePermissions(roleIds);

  // Super admin bypass
  if (permissions.has(Permission.ADMIN_FULL_ACCESS)) {
    return true;
  }

  return permissions.has(permission);
}

/**
 * Check if roles include ANY of the specified permissions.
 */
export function hasAnyPermission(
  roleIds: readonly string[],
  requiredPermissions: readonly Permission[],
): boolean {
  const permissions = resolvePermissions(roleIds);

  // Super admin bypass
  if (permissions.has(Permission.ADMIN_FULL_ACCESS)) {
    return true;
  }

  return requiredPermissions.some((p) => permissions.has(p));
}

/**
 * Check if roles include ALL of the specified permissions.
 */
export function hasAllPermissions(
  roleIds: readonly string[],
  requiredPermissions: readonly Permission[],
): boolean {
  const permissions = resolvePermissions(roleIds);

  // Super admin bypass
  if (permissions.has(Permission.ADMIN_FULL_ACCESS)) {
    return true;
  }

  return requiredPermissions.every((p) => permissions.has(p));
}

/**
 * Check if user has a specific role.
 */
export function hasRole(roleIds: readonly string[], roleId: RoleId): boolean {
  return roleIds.includes(roleId);
}

/**
 * Check if user is admin (has admin:full_access permission).
 */
export function isAdmin(roleIds: readonly string[]): boolean {
  return hasPermission(roleIds, Permission.ADMIN_FULL_ACCESS);
}

/**
 * Get all permissions as an array (for debugging/introspection).
 */
export function getPermissionsArray(roleIds: readonly string[]): Permission[] {
  return Array.from(resolvePermissions(roleIds));
}

/**
 * Get roles that have a specific permission.
 * Useful for documentation and debugging.
 */
export function getRolesWithPermission(permission: Permission): RoleId[] {
  return Object.values(ROLES)
    .filter((role) => {
      for (const groupId of role.groups) {
        const group = Object.values(PERMISSION_GROUPS).find((g) => g.id === groupId);
        if (group && (group.permissions as readonly Permission[]).includes(permission)) {
          return true;
        }
      }
      return false;
    })
    .map((r) => r.id as RoleId);
}
