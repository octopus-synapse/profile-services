/**
 * Permission Resolver Tests
 *
 * Unit tests for permission resolution logic.
 */
import { describe, expect, it } from 'bun:test';
import { Permission } from './permission.enum';
import {
  getRolesWithPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  hasRole,
  isAdmin,
  resolvePermissions,
} from './permission-resolver';
import { ROLES } from './roles';

describe('PermissionResolver', () => {
  describe('resolvePermissions', () => {
    it('should return empty set for empty roles', () => {
      const result = resolvePermissions([]);
      expect(result.size).toBe(0);
    });

    it('should return empty set for invalid roles', () => {
      const result = resolvePermissions(['invalid_role']);
      expect(result.size).toBe(0);
    });

    it('should resolve permissions for USER role', () => {
      const result = resolvePermissions([ROLES.USER.id]);

      expect(result.has(Permission.RESUME_CREATE)).toBe(true);
      expect(result.has(Permission.RESUME_READ)).toBe(true);
      expect(result.has(Permission.RESUME_UPDATE)).toBe(true);
      expect(result.has(Permission.RESUME_DELETE)).toBe(true);
      expect(result.has(Permission.USER_PROFILE_READ)).toBe(true);
      expect(result.has(Permission.USER_PROFILE_UPDATE)).toBe(true);
      expect(result.has(Permission.CHAT_USE)).toBe(true);
      expect(result.has(Permission.SOCIAL_USE)).toBe(true);

      // Should NOT have admin permissions
      expect(result.has(Permission.ADMIN_FULL_ACCESS)).toBe(false);
      expect(result.has(Permission.USER_MANAGE)).toBe(false);
      expect(result.has(Permission.THEME_CREATE)).toBe(false);
    });

    it('should resolve all permissions for ADMIN role', () => {
      const result = resolvePermissions([ROLES.ADMIN.id]);

      // User permissions
      expect(result.has(Permission.RESUME_CREATE)).toBe(true);
      expect(result.has(Permission.USER_PROFILE_READ)).toBe(true);

      // Admin permissions
      expect(result.has(Permission.ADMIN_FULL_ACCESS)).toBe(true);
      expect(result.has(Permission.USER_MANAGE)).toBe(true);
      expect(result.has(Permission.THEME_CREATE)).toBe(true);
      expect(result.has(Permission.SKILL_MANAGE)).toBe(true);
      expect(result.has(Permission.PLATFORM_MANAGE)).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return false for empty roles', () => {
      expect(hasPermission([], Permission.RESUME_CREATE)).toBe(false);
    });

    it('should return true for valid permission', () => {
      expect(hasPermission([ROLES.USER.id], Permission.RESUME_CREATE)).toBe(true);
    });

    it('should return false for missing permission', () => {
      expect(hasPermission([ROLES.USER.id], Permission.THEME_CREATE)).toBe(false);
    });

    it('should return true for ADMIN on any permission', () => {
      expect(hasPermission([ROLES.ADMIN.id], Permission.THEME_CREATE)).toBe(true);
      expect(hasPermission([ROLES.ADMIN.id], Permission.USER_MANAGE)).toBe(true);
      expect(hasPermission([ROLES.ADMIN.id], Permission.PLATFORM_MANAGE)).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if any permission matches', () => {
      const result = hasAnyPermission(
        [ROLES.USER.id],
        [Permission.RESUME_CREATE, Permission.THEME_CREATE],
      );
      expect(result).toBe(true);
    });

    it('should return false if no permission matches', () => {
      const result = hasAnyPermission(
        [ROLES.USER.id],
        [Permission.THEME_CREATE, Permission.USER_MANAGE],
      );
      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if all permissions match', () => {
      const result = hasAllPermissions(
        [ROLES.USER.id],
        [Permission.RESUME_CREATE, Permission.RESUME_READ],
      );
      expect(result).toBe(true);
    });

    it('should return false if any permission is missing', () => {
      const result = hasAllPermissions(
        [ROLES.USER.id],
        [Permission.RESUME_CREATE, Permission.THEME_CREATE],
      );
      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true for existing role', () => {
      expect(hasRole([ROLES.USER.id, ROLES.ADMIN.id], ROLES.ADMIN.id)).toBe(true);
    });

    it('should return false for missing role', () => {
      expect(hasRole([ROLES.USER.id], ROLES.ADMIN.id)).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN', () => {
      expect(isAdmin([ROLES.ADMIN.id])).toBe(true);
    });

    it('should return false for regular USER', () => {
      expect(isAdmin([ROLES.USER.id])).toBe(false);
    });
  });

  describe('getRolesWithPermission', () => {
    it('should find roles that have RESUME_CREATE', () => {
      const roles = getRolesWithPermission(Permission.RESUME_CREATE);
      expect(roles).toContain(ROLES.USER.id);
      expect(roles).toContain(ROLES.ADMIN.id);
    });

    it('should find roles that have THEME_CREATE', () => {
      const roles = getRolesWithPermission(Permission.THEME_CREATE);
      expect(roles).toContain(ROLES.ADMIN.id);
      expect(roles).not.toContain(ROLES.USER.id);
    });
  });
});
