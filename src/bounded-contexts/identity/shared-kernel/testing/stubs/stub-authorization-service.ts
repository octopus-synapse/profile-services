/**
 * Stub Authorization Service for Testing
 *
 * Provides controllable authorization behavior for tests.
 */

import { UserAuthContext } from '../../../authorization/domain/entities/user-auth-context.entity';
import { AuthorizationServicePort } from '../../../authorization/services/authorization-service.port';

export class StubAuthorizationService extends AuthorizationServicePort {
  private privilegedUsers = new Map<string, Set<string>>();
  private userRoles = new Map<string, Set<string>>();
  private userGroups = new Map<string, Set<string>>();
  private roleUserCounts = new Map<string, number>();
  private lastAdmin: string | null = null;

  // ============ Test Helpers ============

  /**
   * Set a user as having a specific permission.
   */
  setUserPermission(userId: string, permission: string, hasIt = true): void {
    if (!this.privilegedUsers.has(userId)) {
      this.privilegedUsers.set(userId, new Set());
    }
    const perms = this.privilegedUsers.get(userId) ?? new Set<string>();
    if (hasIt) {
      perms.add(permission);
    } else {
      perms.delete(permission);
    }
  }

  /**
   * Set a user's role.
   */
  setUserRole(userId: string, role: string, hasIt = true): void {
    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }
    const roles = this.userRoles.get(userId) ?? new Set<string>();
    if (hasIt) {
      roles.add(role);
    } else {
      roles.delete(role);
    }
  }

  /**
   * Set user count for a role.
   */
  setRoleUserCount(role: string, count: number): void {
    this.roleUserCounts.set(role, count);
  }

  /**
   * Convenience: Set admin role count.
   * Equivalent to setRoleUserCount('admin', count).
   */
  setUsersWithAdminRole(count: number): void {
    this.setRoleUserCount('admin', count);
  }

  /**
   * Convenience: Set a user as privileged (has manage permission on all resources).
   * Common pattern in tests for admin-like behavior.
   */
  setPrivilegedUser(userId: string, isPrivileged: boolean): void {
    this.setUserPermission(userId, 'user:manage', isPrivileged);
  }

  /**
   * Set a user as the last admin.
   */
  setLastAdmin(userId: string | null): void {
    this.lastAdmin = userId;
  }

  /**
   * Clear all test data.
   */
  clear(): void {
    this.privilegedUsers.clear();
    this.userRoles.clear();
    this.userGroups.clear();
    this.roleUserCounts.clear();
    this.lastAdmin = null;
  }

  // ============ Port Implementation ============

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const perms = this.privilegedUsers.get(userId);
    if (!perms) return false;
    const permission = `${resource}:${action}`;
    return perms.has(permission) || perms.has('*:*') || perms.has(`${resource}:*`);
  }

  async hasAnyPermission(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    for (const { resource, action } of permissions) {
      if (await this.hasPermission(userId, resource, action)) {
        return true;
      }
    }
    return false;
  }

  async hasAllPermissions(
    userId: string,
    permissions: Array<{ resource: string; action: string }>,
  ): Promise<boolean> {
    for (const { resource, action } of permissions) {
      if (!(await this.hasPermission(userId, resource, action))) {
        return false;
      }
    }
    return true;
  }

  async getContext(userId: string): Promise<UserAuthContext> {
    // Return an empty context - tests that need real context behavior
    // should use the actual AuthorizationService or extend this stub
    return UserAuthContext.empty(userId);
  }

  async getResourcePermissions(userId: string, resource: string): Promise<string[]> {
    const perms = this.privilegedUsers.get(userId);
    if (!perms) return [];
    const result: string[] = [];
    for (const perm of perms) {
      if (perm.startsWith(`${resource}:`) || perm === '*:*') {
        const action = perm.split(':')[1];
        if (action) result.push(action);
      }
    }
    return result;
  }

  async getAllPermissions(userId: string): Promise<string[]> {
    const perms = this.privilegedUsers.get(userId);
    return perms ? Array.from(perms) : [];
  }

  async hasRole(userId: string, roleIdOrName: string): Promise<boolean> {
    const roles = this.userRoles.get(userId);
    return roles?.has(roleIdOrName) ?? false;
  }

  async inGroup(userId: string, groupIdOrName: string): Promise<boolean> {
    const groups = this.userGroups.get(userId);
    return groups?.has(groupIdOrName) ?? false;
  }

  async countUsersWithRole(roleName: string): Promise<number> {
    return this.roleUserCounts.get(roleName) ?? 0;
  }

  async isLastAdmin(userId: string): Promise<boolean> {
    return this.lastAdmin === userId;
  }
}
