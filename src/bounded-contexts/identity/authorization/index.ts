/**
 * Authorization Module Barrel Export
 *
 * Public API for the authorization system.
 */

export { AuthorizationServicePort } from './application/ports/authorization-service.port';
// Application Services & Ports
export { AuthorizationService } from './application/services/authorization.service';
export { AuthorizationManagementService } from './application/services/authorization-management.service';
// Domain Entities
export {
  type CreatePermissionInput,
  Permission,
  type PermissionId,
  type PermissionProps,
  type StandardAction,
  StandardActions,
  type StandardResource,
  StandardResources,
} from './domain/entities/permission.entity';
export {
  type CreateRoleInput,
  Role,
  type RoleId,
  type RoleProps,
  type UpdateRoleInput,
} from './domain/entities/role.entity';
export {
  type PermissionSource,
  type ResolvedPermission,
  UserAuthContext,
  type UserId,
} from './domain/entities/user-auth-context.entity';
// Repositories (for admin use). P0-009: GroupRepository removed (legacy
// hierarchy dropped by `20260430040810_authz_refactor`).
export { PermissionRepository } from './infrastructure/repositories/permission.repository';
export { RoleRepository } from './infrastructure/repositories/role.repository';
export { UserAuthorizationRepository } from './infrastructure/repositories/user-authorization.repository';
