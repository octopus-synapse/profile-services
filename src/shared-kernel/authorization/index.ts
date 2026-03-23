/**
 * Authorization Module Exports
 *
 * Public API for the authorization system.
 *
 * Usage:
 * import { Permission, RequirePermission, hasPermission } from '@/shared-kernel/authorization';
 */

// Ownership Decorators
export {
  OWNERSHIP_KEY,
  OwnershipGuard,
  type OwnershipMetadata,
  ResourceOwner,
} from './ownership.guard';
// Enums & Types
export { Permission } from './permission.enum';
// Guards
export { PermissionGuard } from './permission.guard';
export {
  PERMISSION_GROUPS,
  type PermissionGroup,
  type PermissionGroupId,
} from './permission-groups';
// Resolution (pure functions)
export {
  getPermissionsArray,
  getRolesWithPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
  isAdmin,
  resolvePermissions,
} from './permission-resolver';
// Composite Decorators
export {
  AuthenticatedOnly,
  ProtectedResource,
  ProtectedResume,
  ProtectedUserProfile,
} from './protected-resource.decorator';
// Permission Decorators
export {
  AdminOnly,
  PERMISSION_KEY,
  PERMISSIONS_KEY,
  type PermissionStrategy,
  RequirePermission,
  RequirePermissions,
} from './require-permission.decorator';
export { getAllRoleIds, getRoleById, isValidRoleId, ROLES, type Role, type RoleId } from './roles';
