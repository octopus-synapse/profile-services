/**
 * Authorization Module Barrel Export
 *
 * Public API for the authorization system.
 */

// Module
export * from './authorization.module';
export {
  type CreateGroupInput,
  Group,
  type GroupId,
  type GroupProps,
  type UpdateGroupInput,
} from './domain/entities/group.entity';
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
// Guards & Decorators
export {
  AdminOnly,
  AdminOrApprover,
  ApproverOnly,
  CanManage,
  PermissionGuard,
  type PermissionRequirement,
  type PermissionStrategy,
  Protected,
  RequirePermission,
  RequirePermissions,
  RequireRole,
  RequireRoles,
} from './infrastructure/guards/permission.guard';
export { GroupRepository } from './infrastructure/repositories/group.repository';

// Repositories (for admin use)
export { PermissionRepository } from './infrastructure/repositories/permission.repository';
export { RoleRepository } from './infrastructure/repositories/role.repository';
export { UserAuthorizationRepository } from './infrastructure/repositories/user-authorization.repository';
// Services
export { AuthorizationService } from './services/authorization.service';
