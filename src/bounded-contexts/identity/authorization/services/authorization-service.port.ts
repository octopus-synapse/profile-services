/**
 * Authorization Service Port
 *
 * Defines the abstraction for authorization operations.
 * This port enables testability with stub implementations.
 */

import type { UserAuthContext } from '../domain/entities/user-auth-context.entity';

export type UserId = string;

/**
 * Abstract port for authorization service operations.
 * Use this type for dependency injection in services that need authorization.
 */
export abstract class AuthorizationServicePort {
  /**
   * Check if a user has a specific permission on a resource.
   */
  abstract hasPermission(userId: UserId, resource: string, action: string): Promise<boolean>;

  /**
   * Check if a user has any of the specified permissions.
   */
  abstract hasAnyPermission(
    userId: UserId,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean>;

  /**
   * Check if a user has all of the specified permissions.
   */
  abstract hasAllPermissions(
    userId: UserId,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean>;

  /**
   * Get the full authorization context for a user.
   */
  abstract getContext(userId: UserId): Promise<UserAuthContext>;

  /**
   * Get all permissions a user has for a specific resource.
   */
  abstract getResourcePermissions(userId: UserId, resource: string): Promise<string[]>;

  /**
   * Get all permissions a user has.
   */
  abstract getAllPermissions(userId: UserId): Promise<string[]>;

  /**
   * Check if a user has a specific role.
   */
  abstract hasRole(userId: UserId, roleIdOrName: string): Promise<boolean>;

  /**
   * Check if a user is in a specific group.
   */
  abstract inGroup(userId: UserId, groupIdOrName: string): Promise<boolean>;

  /**
   * Count users with a specific role.
   */
  abstract countUsersWithRole(roleName: string): Promise<number>;

  /**
   * Check if a user is the last admin.
   */
  abstract isLastAdmin(userId: UserId): Promise<boolean>;
}
