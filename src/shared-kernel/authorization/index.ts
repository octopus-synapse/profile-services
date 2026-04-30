/**
 * Authorization Module Exports
 *
 * Public API for the authorization system. Phase-2 cutover removed the
 * Nest-decorator-based guards (`PermissionGuard`, `OwnershipGuard`) and
 * the metadata decorators that paired with them — the route descriptor
 * now carries `permission: Permission | { resource, action }` directly,
 * and the Elysia pipeline resolves it via `PermissionCheckerPort` and
 * the pure functions in `permission-resolver.ts`.
 */

export {
  AuthenticationRequiredException,
  MissingAnyRequiredPermissionException,
  MissingRequiredPermissionsException,
  MissingRequiredRolesException,
  OwnershipAccessDeniedException,
  OwnershipMissingParamException,
  OwnershipResourceMissingException,
  UserRolesNotAvailableException,
} from './authorization.exceptions';
export { AuthorizationCheckPort } from './authorization-check.port';
export { Permission } from './permission.enum';
export {
  PERMISSION_GROUPS,
  type PermissionGroup,
  type PermissionGroupId,
} from './permission-groups';
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
export { getAllRoleIds, getRoleById, isValidRoleId, ROLES, type Role, type RoleId } from './roles';
