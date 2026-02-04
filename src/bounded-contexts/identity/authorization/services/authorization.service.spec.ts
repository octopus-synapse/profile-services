/**
 * Authorization Service Unit Tests
 *
 * Tests the permission checking and caching system.
 * Focus: Permission resolution, context caching, cache invalidation.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 *
 * Note: This service has complex internal dependencies (PermissionResolverService).
 * These tests verify the public API contract and caching behavior.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AuthorizationService } from './authorization.service';
import type { PermissionRepository } from '../infrastructure/repositories/permission.repository';
import type { RoleRepository } from '../infrastructure/repositories/role.repository';
import type { GroupRepository } from '../infrastructure/repositories/group.repository';
import type { UserAuthorizationRepository } from '../infrastructure/repositories/user-authorization.repository';

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let mockPermissionRepo: Partial<PermissionRepository>;
  let mockRoleRepo: Partial<RoleRepository>;
  let mockGroupRepo: Partial<GroupRepository>;
  let mockUserAuthRepo: Partial<UserAuthorizationRepository>;

  const mockUserId = 'user-123';

  beforeEach(() => {
    // Mock permissions
    const mockPermissions = [
      { id: 'perm-1', resource: 'resume', action: 'read', key: 'resume:read' },
      {
        id: 'perm-2',
        resource: 'resume',
        action: 'write',
        key: 'resume:write',
      },
      { id: 'perm-3', resource: 'export', action: 'pdf', key: 'export:pdf' },
    ];

    // Mock roles
    const mockRoles = [
      {
        id: 'role-1',
        name: 'user',
        displayName: 'User',
        permissionIds: ['perm-1', 'perm-2'],
      },
    ];

    mockPermissionRepo = {
      findById: mock((id: string) =>
        Promise.resolve(mockPermissions.find((p) => p.id === id) ?? null),
      ),
      findByIds: mock((ids: string[]) =>
        Promise.resolve(mockPermissions.filter((p) => ids.includes(p.id))),
      ),
      findAll: mock(() => Promise.resolve(mockPermissions)),
    };

    mockRoleRepo = {
      findById: mock((id: string) =>
        Promise.resolve(mockRoles.find((r) => r.id === id) ?? null),
      ),
      findByIds: mock((ids: string[]) =>
        Promise.resolve(mockRoles.filter((r) => ids.includes(r.id))),
      ),
      findAll: mock(() => Promise.resolve(mockRoles)),
    };

    mockGroupRepo = {
      findById: mock(() => Promise.resolve(null)),
      findByIds: mock(() => Promise.resolve([])),
      findAll: mock(() => Promise.resolve([])),
    };

    mockUserAuthRepo = {
      getUserPermissions: mock(() =>
        Promise.resolve([{ permissionId: 'perm-3', granted: true }]),
      ),
      getUserRoles: mock(() => Promise.resolve([{ roleId: 'role-1' }])),
      getUserGroups: mock(() => Promise.resolve([])),
    };

    service = new AuthorizationService(
      mockPermissionRepo as PermissionRepository,
      mockRoleRepo as RoleRepository,
      mockGroupRepo as GroupRepository,
      mockUserAuthRepo as UserAuthorizationRepository,
    );
  });

  describe('hasPermission', () => {
    it('should return true when user has permission through role', async () => {
      const result = await service.hasPermission(mockUserId, 'resume', 'read');

      expect(result).toBe(true);
    });

    it('should return true when user has direct permission', async () => {
      const result = await service.hasPermission(mockUserId, 'export', 'pdf');

      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      const result = await service.hasPermission(mockUserId, 'admin', 'delete');

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', async () => {
      const permissions = [
        { resource: 'admin', action: 'delete' },
        { resource: 'resume', action: 'read' },
      ];

      const result = await service.hasAnyPermission(mockUserId, permissions);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      const permissions = [
        { resource: 'admin', action: 'delete' },
        { resource: 'billing', action: 'manage' },
      ];

      const result = await service.hasAnyPermission(mockUserId, permissions);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', async () => {
      const permissions = [
        { resource: 'resume', action: 'read' },
        { resource: 'resume', action: 'write' },
      ];

      const result = await service.hasAllPermissions(mockUserId, permissions);

      expect(result).toBe(true);
    });

    it('should return false when user lacks any permission', async () => {
      const permissions = [
        { resource: 'resume', action: 'read' },
        { resource: 'admin', action: 'delete' },
      ];

      const result = await service.hasAllPermissions(mockUserId, permissions);

      expect(result).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should provide getContext method', async () => {
      const context = await service.getContext(mockUserId);

      expect(context).toBeDefined();
      expect(typeof context.hasPermission).toBe('function');
    });

    it('should provide invalidateCache method', () => {
      // Should not throw
      expect(() => service.invalidateCache(mockUserId)).not.toThrow();
    });

    it('should provide invalidateAllCaches method', () => {
      // Should not throw
      expect(() => service.invalidateAllCaches()).not.toThrow();
    });
  });

  describe('getResourcePermissions', () => {
    it('should return permissions for a specific resource', async () => {
      const permissions = await service.getResourcePermissions(
        mockUserId,
        'resume',
      );

      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
    });

    it('should return empty array for resource without permissions', async () => {
      const permissions = await service.getResourcePermissions(
        mockUserId,
        'unknown',
      );

      expect(permissions).toEqual([]);
    });
  });
});
