/**
 * Authorization Use Cases Port
 *
 * Defines the injection tokens and interfaces for authorization use cases.
 */

import type { UserAuthContext, UserId } from '../../domain/entities/user-auth-context.entity';
import type { AssignRoleParams } from '../use-cases/authorization-management/assign-role.use-case';
import type { DenyPermissionParams } from '../use-cases/authorization-management/deny-permission.use-case';
import type { GrantPermissionParams } from '../use-cases/authorization-management/grant-permission.use-case';
import type { AddToGroupParams } from '../use-cases/authorization-management/add-to-group.use-case';
import type { RevokeRoleParams } from '../use-cases/authorization-management/revoke-role.use-case';

// ============================================================================
// Injection Tokens
// ============================================================================

export const AUTHORIZATION_CHECK_USE_CASES = Symbol('AUTHORIZATION_CHECK_USE_CASES');
export const AUTHORIZATION_MANAGEMENT_USE_CASES = Symbol('AUTHORIZATION_MANAGEMENT_USE_CASES');

// ============================================================================
// Use Cases Interfaces
// ============================================================================

export interface AuthorizationCheckUseCases {
  getAuthContextUseCase: {
    execute: (userId: UserId) => Promise<UserAuthContext>;
  };
  checkPermissionUseCase: {
    execute: (userId: UserId, resource: string, action: string) => Promise<boolean>;
  };
  checkAnyPermissionUseCase: {
    execute: (
      userId: UserId,
      permissions: Array<{ resource: string; action: string }>,
    ) => Promise<boolean>;
  };
  checkAllPermissionsUseCase: {
    execute: (
      userId: UserId,
      permissions: Array<{ resource: string; action: string }>,
    ) => Promise<boolean>;
  };
  getResourcePermissionsUseCase: {
    execute: (userId: UserId, resource: string) => Promise<string[]>;
  };
  getAllPermissionsUseCase: {
    execute: (userId: UserId) => Promise<string[]>;
  };
  checkRoleUseCase: {
    execute: (userId: UserId, roleIdOrName: string) => Promise<boolean>;
  };
  checkGroupMembershipUseCase: {
    execute: (userId: UserId, groupIdOrName: string) => Promise<boolean>;
  };
  countUsersWithRoleUseCase: {
    execute: (roleName: string) => Promise<number>;
  };
  checkLastAdminUseCase: {
    execute: (userId: UserId) => Promise<boolean>;
  };
  invalidateCache: (userId: UserId) => void;
  invalidateAllCaches: () => void;
  getCacheStats: () => { size: number; maxSize: number };
}

export interface AuthorizationManagementUseCases {
  assignRoleUseCase: {
    execute: (params: AssignRoleParams) => Promise<void>;
  };
  revokeRoleUseCase: {
    execute: (params: RevokeRoleParams) => Promise<void>;
  };
  grantPermissionUseCase: {
    execute: (params: GrantPermissionParams) => Promise<void>;
  };
  denyPermissionUseCase: {
    execute: (params: DenyPermissionParams) => Promise<void>;
  };
  addToGroupUseCase: {
    execute: (params: AddToGroupParams) => Promise<void>;
  };
  removeFromGroupUseCase: {
    execute: (userId: string, groupId: string) => Promise<void>;
  };
}
