/**
 * Authorization Service Adapter
 *
 * Implements AuthorizationServicePort by delegating to individual use cases.
 * This preserves the cross-BC contract while the internals use Clean Architecture.
 */

import { Inject, Injectable } from '@nestjs/common';
import type { UserAuthContext } from '../../domain/entities/user-auth-context.entity';
import {
  AUTHORIZATION_CHECK_USE_CASES,
  type AuthorizationCheckUseCases,
} from '../../application/ports/authorization-use-cases.port';
import { AuthorizationServicePort, type UserId } from '../../application/ports/authorization-service.port';

@Injectable()
export class AuthorizationServiceAdapter extends AuthorizationServicePort {
  constructor(
    @Inject(AUTHORIZATION_CHECK_USE_CASES)
    private readonly useCases: AuthorizationCheckUseCases,
  ) {
    super();
  }

  async hasPermission(userId: UserId, resource: string, action: string): Promise<boolean> {
    return this.useCases.checkPermissionUseCase.execute(userId, resource, action);
  }

  async hasAnyPermission(
    userId: UserId,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    return this.useCases.checkAnyPermissionUseCase.execute(userId, permissions);
  }

  async hasAllPermissions(
    userId: UserId,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    return this.useCases.checkAllPermissionsUseCase.execute(userId, permissions);
  }

  async getContext(userId: UserId): Promise<UserAuthContext> {
    return this.useCases.getAuthContextUseCase.execute(userId);
  }

  async getResourcePermissions(userId: UserId, resource: string): Promise<string[]> {
    return this.useCases.getResourcePermissionsUseCase.execute(userId, resource);
  }

  async getAllPermissions(userId: UserId): Promise<string[]> {
    return this.useCases.getAllPermissionsUseCase.execute(userId);
  }

  async hasRole(userId: UserId, roleIdOrName: string): Promise<boolean> {
    return this.useCases.checkRoleUseCase.execute(userId, roleIdOrName);
  }

  async inGroup(userId: UserId, groupIdOrName: string): Promise<boolean> {
    return this.useCases.checkGroupMembershipUseCase.execute(userId, groupIdOrName);
  }

  async countUsersWithRole(roleName: string): Promise<number> {
    return this.useCases.countUsersWithRoleUseCase.execute(roleName);
  }

  async isLastAdmin(userId: UserId): Promise<boolean> {
    return this.useCases.checkLastAdminUseCase.execute(userId);
  }

  /**
   * Invalidate cached context for a user.
   * Call this when user's permissions change.
   */
  invalidateCache(userId: UserId): void {
    this.useCases.invalidateCache(userId);
  }

  /**
   * Invalidate all cached contexts.
   * Call this when roles or groups change.
   */
  invalidateAllCaches(): void {
    this.useCases.invalidateAllCaches();
  }

  /**
   * Get cache statistics (for monitoring).
   */
  getCacheStats(): { size: number; maxSize: number } {
    return this.useCases.getCacheStats();
  }
}
