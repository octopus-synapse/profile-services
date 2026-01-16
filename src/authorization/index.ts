/**
 * Authorization Module Barrel Export
 *
 * Public API for the authorization system.
 */

// Module
export * from './authorization.module';

// Domain Entities
export {
  Permission,
  type PermissionId,
  type PermissionProps,
  type CreatePermissionInput,
  StandardActions,
  StandardResources,
  type StandardAction,
  type StandardResource,
} from './domain/entities/permission.entity';

export {
  Role,
  type RoleId,
  type RoleProps,
  type CreateRoleInput,
  type UpdateRoleInput,
} from './domain/entities/role.entity';

export {
  Group,
  type GroupId,
  type GroupProps,
  type CreateGroupInput,
  type UpdateGroupInput,
} from './domain/entities/group.entity';

export {
  UserAuthContext,
  type UserId,
  type ResolvedPermission,
  type PermissionSource,
} from './domain/entities/user-auth-context.entity';

// Services
export { AuthorizationService } from './services/authorization.service';

// Guards & Decorators
export {
  PermissionGuard,
  RequirePermission,
  RequirePermissions,
  RequireRole,
  RequireRoles,
  CanManage,
  Protected,
  AdminOnly,
  ApproverOnly,
  AdminOrApprover,
  type PermissionRequirement,
  type PermissionStrategy,
} from './infrastructure/guards/permission.guard';

// Repositories (for admin use)
export { PermissionRepository } from './infrastructure/repositories/permission.repository';
export { RoleRepository } from './infrastructure/repositories/role.repository';
export { GroupRepository } from './infrastructure/repositories/group.repository';
export { UserAuthorizationRepository } from './infrastructure/repositories/user-authorization.repository';
