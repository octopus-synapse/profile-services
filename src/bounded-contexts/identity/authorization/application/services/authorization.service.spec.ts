/**
 * Authorization Service Unit Tests
 *
 * Port-based in-memory repositories.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Group, type GroupId } from '../../domain/entities/group.entity';
import { Permission, type PermissionId } from '../../domain/entities/permission.entity';
import { Role, type RoleId } from '../../domain/entities/role.entity';
import type { UserId } from '../../domain/entities/user-auth-context.entity';
import type {
  IGroupRepository,
  IPermissionRepository,
  IRoleRepository,
  IUserAuthorizationRepository,
  UserGroupMembership,
  UserPermissionAssignment,
  UserRoleAssignment,
} from '../../domain/ports/authorization-repositories.port';
import { AuthorizationService } from './authorization.service';

const makePermission = (id: string, resource: string, action: string): Permission =>
  Permission.fromPersistence({
    id,
    resource,
    action,
    description: undefined,
    isSystem: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makeRole = (id: string, name: string, permissionIds: string[]): Role =>
  Role.fromPersistence({
    id,
    name,
    displayName: name,
    description: undefined,
    isSystem: false,
    priority: 0,
    permissionIds,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('AuthorizationService', () => {
  let service: AuthorizationService;
  let mockPermissionRepo: IPermissionRepository;
  let mockRoleRepo: IRoleRepository;
  let mockGroupRepo: IGroupRepository;
  let mockUserAuthRepo: IUserAuthorizationRepository;

  const mockUserId = 'user-123';

  beforeEach(() => {
    const mockPermissions = [
      makePermission('perm-1', 'resume', 'read'),
      makePermission('perm-2', 'resume', 'write'),
      makePermission('perm-3', 'export', 'pdf'),
    ];
    const mockRoles = [makeRole('role-1', 'user', ['perm-1', 'perm-2'])];

    mockPermissionRepo = {
      findById: mock(async (id: PermissionId) => mockPermissions.find((p) => p.id === id) ?? null),
      findByIds: mock(async (ids: PermissionId[]) =>
        mockPermissions.filter((p) => ids.includes(p.id)),
      ),
      findByKey: mock(
        async (resource: string, action: string) =>
          mockPermissions.find((p) => p.resource === resource && p.action === action) ?? null,
      ),
    };

    mockRoleRepo = {
      findById: mock(async (id: RoleId) => mockRoles.find((r) => r.id === id) ?? null),
      findByIds: mock(async (ids: RoleId[]) => mockRoles.filter((r) => ids.includes(r.id))),
      findByName: mock(async (name: string) => mockRoles.find((r) => r.name === name) ?? null),
    };

    mockGroupRepo = {
      findById: mock(async (_id: GroupId): Promise<Group | null> => null),
      findByIds: mock(async (_ids: GroupId[]): Promise<Group[]> => []),
      findByName: mock(async (_name: string): Promise<Group | null> => null),
      findAncestors: mock(async (_id: GroupId): Promise<Group[]> => []),
    };

    mockUserAuthRepo = {
      getUserPermissions: mock(
        async (_userId: UserId): Promise<UserPermissionAssignment[]> => [
          { permissionId: 'perm-3', granted: true },
        ],
      ),
      getUserRoles: mock(
        async (_userId: UserId): Promise<UserRoleAssignment[]> => [{ roleId: 'role-1' }],
      ),
      getUserGroups: mock(async (_userId: UserId): Promise<UserGroupMembership[]> => []),
      assignRole: mock(async () => {}),
      revokeRole: mock(async () => {}),
      addToGroup: mock(async () => {}),
      removeFromGroup: mock(async () => {}),
      grantPermission: mock(async () => {}),
      denyPermission: mock(async () => {}),
      countUsersWithRoleName: mock(async () => 0),
    };

    service = new AuthorizationService(
      mockPermissionRepo,
      mockRoleRepo,
      mockGroupRepo,
      mockUserAuthRepo,
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
      expect(() => service.invalidateCache(mockUserId)).not.toThrow();
    });

    it('should provide invalidateAllCaches method', () => {
      expect(() => service.invalidateAllCaches()).not.toThrow();
    });
  });

  describe('getResourcePermissions', () => {
    it('should return permissions for a specific resource', async () => {
      const permissions = await service.getResourcePermissions(mockUserId, 'resume');

      expect(permissions).toContain('read');
      expect(permissions).toContain('write');
    });

    it('should return empty array for resource without permissions', async () => {
      const permissions = await service.getResourcePermissions(mockUserId, 'unknown');

      expect(permissions).toEqual([]);
    });
  });
});
