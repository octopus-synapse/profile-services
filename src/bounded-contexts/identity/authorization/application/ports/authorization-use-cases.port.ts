/**
 * Authorization Use Cases Port
 *
 * Defines the injection tokens and interfaces for authorization use cases.
 */

import type { UserAuthContext, UserId } from '../../domain/entities/user-auth-context.entity';
import type { AssignRoleParams } from '../use-cases/authorization-management/assign-role.use-case';
import type { DenyPermissionParams } from '../use-cases/authorization-management/deny-permission.use-case';
import type { GrantPermissionParams } from '../use-cases/authorization-management/grant-permission.use-case';
import type { RevokeRoleParams } from '../use-cases/authorization-management/revoke-role.use-case';

// ============================================================================
// Injection Tokens
// ============================================================================

// ============================================================================
// Use Cases Interfaces
// ============================================================================

export abstract class AuthorizationCheckUseCases {
  abstract readonly getAuthContextUseCase: {
    execute: (userId: UserId) => Promise<UserAuthContext>;
  };
  abstract readonly checkPermissionUseCase: {
    execute: (userId: UserId, resource: string, action: string) => Promise<boolean>;
  };
  abstract readonly checkAnyPermissionUseCase: {
    execute: (
      userId: UserId,
      permissions: Array<{ resource: string; action: string }>,
    ) => Promise<boolean>;
  };
  abstract readonly checkAllPermissionsUseCase: {
    execute: (
      userId: UserId,
      permissions: Array<{ resource: string; action: string }>,
    ) => Promise<boolean>;
  };
  abstract readonly getResourcePermissionsUseCase: {
    execute: (userId: UserId, resource: string) => Promise<string[]>;
  };
  abstract readonly getAllPermissionsUseCase: { execute: (userId: UserId) => Promise<string[]> };
  abstract readonly checkRoleUseCase: {
    execute: (userId: UserId, roleIdOrName: string) => Promise<boolean>;
  };
  abstract readonly countUsersWithRoleUseCase: { execute: (roleName: string) => Promise<number> };
  abstract readonly checkLastAdminUseCase: { execute: (userId: UserId) => Promise<boolean> };
  abstract readonly invalidateCache: (userId: UserId) => void;
  abstract readonly invalidateAllCaches: () => void;
  abstract readonly getCacheStats: () => { size: number; maxSize: number };
}

export abstract class AuthorizationManagementUseCases {
  abstract readonly assignRoleUseCase: { execute: (params: AssignRoleParams) => Promise<void> };
  abstract readonly revokeRoleUseCase: { execute: (params: RevokeRoleParams) => Promise<void> };
  abstract readonly grantPermissionUseCase: {
    execute: (params: GrantPermissionParams) => Promise<void>;
  };
  abstract readonly denyPermissionUseCase: {
    execute: (params: DenyPermissionParams) => Promise<void>;
  };
}
