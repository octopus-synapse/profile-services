/**
 * Authorization Check Use Cases - Unit Tests
 *
 * Tests all 10 check use cases with real in-memory repositories
 * and the real PermissionResolverService (no mocks).
 *
 * Each use case is constructed directly, matching the composition wiring.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { Group } from '../../../domain/entities/group.entity';
import { Permission } from '../../../domain/entities/permission.entity';
import { Role } from '../../../domain/entities/role.entity';
import { PermissionResolverService } from '../../../domain/services/permission-resolver.service';
import {
  InMemoryAuthorizationCache,
  InMemoryGroupRepository,
  InMemoryPermissionRepository,
  InMemoryRoleRepository,
  InMemoryUserAuthorizationRepository,
} from '../../../testing';
import { CheckAllPermissionsUseCase } from './check-all-permissions.use-case';
import { CheckAnyPermissionUseCase } from './check-any-permission.use-case';
import { CheckGroupMembershipUseCase } from './check-group-membership.use-case';
import { CheckLastAdminUseCase } from './check-last-admin.use-case';
import { CheckPermissionUseCase } from './check-permission.use-case';
import { CheckRoleUseCase } from './check-role.use-case';
import { CountUsersWithRoleUseCase } from './count-users-with-role.use-case';
import { GetAllPermissionsUseCase } from './get-all-permissions.use-case';
import { GetAuthContextUseCase } from './get-auth-context.use-case';
import { GetResourcePermissionsUseCase } from './get-resource-permissions.use-case';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date();

function makePermission(id: string, resource: string, action: string): Permission {
  return Permission.fromPersistence({
    id,
    resource,
    action,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  });
}

function makeRole(id: string, name: string, permissionIds: string[]): Role {
  return Role.fromPersistence({
    id,
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    isSystem: false,
    priority: 0,
    permissionIds,
    createdAt: now,
    updatedAt: now,
  });
}

function makeGroup(
  id: string,
  name: string,
  opts: { roleIds?: string[]; permissionIds?: string[]; parentId?: string } = {},
): Group {
  return Group.fromPersistence({
    id,
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    isSystem: false,
    parentId: opts.parentId,
    roleIds: opts.roleIds ?? [],
    permissionIds: opts.permissionIds ?? [],
    createdAt: now,
    updatedAt: now,
  });
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Authorization Check Use Cases', () => {
  // Repos
  let permissionRepo: InMemoryPermissionRepository;
  let roleRepo: InMemoryRoleRepository;
  let groupRepo: InMemoryGroupRepository;
  let userAuthRepo: InMemoryUserAuthorizationRepository;
  let cache: InMemoryAuthorizationCache;

  // Domain service
  let resolver: PermissionResolverService;

  // Use cases
  let getAuthContext: GetAuthContextUseCase;
  let checkPermission: CheckPermissionUseCase;
  let checkAnyPermission: CheckAnyPermissionUseCase;
  let checkAllPermissions: CheckAllPermissionsUseCase;
  let checkRole: CheckRoleUseCase;
  let checkGroupMembership: CheckGroupMembershipUseCase;
  let checkLastAdmin: CheckLastAdminUseCase;
  let getAllPermissions: GetAllPermissionsUseCase;
  let getResourcePermissions: GetResourcePermissionsUseCase;
  let countUsersWithRole: CountUsersWithRoleUseCase;

  // Shared fixtures
  const userId = 'user-1';

  const permissions = {
    resumeRead: makePermission('perm-1', 'resume', 'read'),
    resumeWrite: makePermission('perm-2', 'resume', 'write'),
    resumeDelete: makePermission('perm-3', 'resume', 'delete'),
    exportPdf: makePermission('perm-4', 'export', 'pdf'),
    adminManage: makePermission('perm-5', 'admin', 'manage'),
    userRead: makePermission('perm-6', 'user', 'read'),
  };

  const roles = {
    editor: makeRole('role-editor', 'editor', ['perm-1', 'perm-2']),
    admin: makeRole('role-admin', 'admin', ['perm-5', 'perm-6']),
    viewer: makeRole('role-viewer', 'viewer', ['perm-1']),
  };

  const groups = {
    engineering: makeGroup('group-eng', 'engineering', {
      roleIds: ['role-viewer'],
      permissionIds: ['perm-4'],
    }),
    platform: makeGroup('group-platform', 'platform', {
      parentId: 'group-eng',
      permissionIds: ['perm-3'],
    }),
  };

  beforeEach(() => {
    // Fresh repositories
    permissionRepo = new InMemoryPermissionRepository();
    roleRepo = new InMemoryRoleRepository();
    groupRepo = new InMemoryGroupRepository();
    userAuthRepo = new InMemoryUserAuthorizationRepository();
    cache = new InMemoryAuthorizationCache();

    // Seed reference data
    permissionRepo.seedMany(Object.values(permissions));
    roleRepo.seedMany(Object.values(roles));
    groupRepo.seedMany(Object.values(groups));

    // Wire domain service and use cases (mirrors composition)
    resolver = new PermissionResolverService(permissionRepo, roleRepo, groupRepo, userAuthRepo);
    getAuthContext = new GetAuthContextUseCase(resolver, cache);
    checkPermission = new CheckPermissionUseCase(getAuthContext);
    checkAnyPermission = new CheckAnyPermissionUseCase(getAuthContext);
    checkAllPermissions = new CheckAllPermissionsUseCase(getAuthContext);
    getAllPermissions = new GetAllPermissionsUseCase(getAuthContext);
    getResourcePermissions = new GetResourcePermissionsUseCase(getAuthContext);
    checkRole = new CheckRoleUseCase(getAuthContext, roleRepo);
    checkGroupMembership = new CheckGroupMembershipUseCase(getAuthContext, groupRepo);
    countUsersWithRole = new CountUsersWithRoleUseCase(userAuthRepo);
    checkLastAdmin = new CheckLastAdminUseCase(checkRole, countUsersWithRole);
  });

  // =========================================================================
  // GetAuthContext
  // =========================================================================

  describe('GetAuthContextUseCase', () => {
    it('should resolve an empty context for a user with no assignments', async () => {
      const ctx = await getAuthContext.execute(userId);

      expect(ctx.userId).toBe(userId);
      expect(ctx.grantedPermissionKeys).toEqual([]);
    });

    it('should aggregate permissions from roles', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const ctx = await getAuthContext.execute(userId);

      expect(ctx.hasPermission('resume', 'read')).toBe(true);
      expect(ctx.hasPermission('resume', 'write')).toBe(true);
      expect(ctx.hasPermission('export', 'pdf')).toBe(false);
    });

    it('should aggregate direct permissions', async () => {
      userAuthRepo.seedPermission(userId, { permissionId: 'perm-4', granted: true });

      const ctx = await getAuthContext.execute(userId);

      expect(ctx.hasPermission('export', 'pdf')).toBe(true);
    });

    it('should cache the context on second call', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      await getAuthContext.execute(userId);
      expect(cache.has(userId)).toBe(true);

      // Mutate repo after caching — cached result should remain
      userAuthRepo.clear();
      const ctx = await getAuthContext.execute(userId);

      expect(ctx.hasPermission('resume', 'read')).toBe(true);
    });

    it('should resolve fresh context after cache invalidation', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });
      await getAuthContext.execute(userId);

      // Invalidate and remove role
      cache.invalidate(userId);
      userAuthRepo.clear();

      const ctx = await getAuthContext.execute(userId);

      expect(ctx.grantedPermissionKeys).toEqual([]);
    });
  });

  // =========================================================================
  // CheckPermission
  // =========================================================================

  describe('CheckPermissionUseCase', () => {
    it('should return true when user has the permission via role', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkPermission.execute(userId, 'resume', 'read');

      expect(result).toBe(true);
    });

    it('should return true when user has a direct granted permission', async () => {
      userAuthRepo.seedPermission(userId, { permissionId: 'perm-4', granted: true });

      const result = await checkPermission.execute(userId, 'export', 'pdf');

      expect(result).toBe(true);
    });

    it('should return false when user lacks the permission', async () => {
      const result = await checkPermission.execute(userId, 'admin', 'manage');

      expect(result).toBe(false);
    });

    it('should return false when permission is directly denied', async () => {
      userAuthRepo.seedPermission(userId, { permissionId: 'perm-1', granted: false });
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkPermission.execute(userId, 'resume', 'read');

      expect(result).toBe(false);
    });

    it('should grant via manage permission (implies all actions on resource)', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-admin' });

      // admin:manage should imply admin:delete, admin:read, etc.
      const result = await checkPermission.execute(userId, 'admin', 'delete');

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // CheckAnyPermission
  // =========================================================================

  describe('CheckAnyPermissionUseCase', () => {
    it('should return true when user has at least one of the permissions', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkAnyPermission.execute(userId, [
        { resource: 'admin', action: 'manage' },
        { resource: 'resume', action: 'read' },
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      const result = await checkAnyPermission.execute(userId, [
        { resource: 'admin', action: 'manage' },
        { resource: 'billing', action: 'read' },
      ]);

      expect(result).toBe(false);
    });

    it('should return false for an empty permissions list', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkAnyPermission.execute(userId, []);

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // CheckAllPermissions
  // =========================================================================

  describe('CheckAllPermissionsUseCase', () => {
    it('should return true when user has all listed permissions', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkAllPermissions.execute(userId, [
        { resource: 'resume', action: 'read' },
        { resource: 'resume', action: 'write' },
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user is missing any permission', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkAllPermissions.execute(userId, [
        { resource: 'resume', action: 'read' },
        { resource: 'export', action: 'pdf' },
      ]);

      expect(result).toBe(false);
    });

    it('should return true for an empty permissions list', async () => {
      const result = await checkAllPermissions.execute(userId, []);

      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // CheckRole
  // =========================================================================

  describe('CheckRoleUseCase', () => {
    it('should return true when user has the role (by id)', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkRole.execute(userId, 'role-editor');

      expect(result).toBe(true);
    });

    it('should return true when user has the role (by name)', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkRole.execute(userId, 'editor');

      expect(result).toBe(true);
    });

    it('should return false when user does not have the role', async () => {
      const result = await checkRole.execute(userId, 'admin');

      expect(result).toBe(false);
    });

    it('should return false for a non-existent role name', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const result = await checkRole.execute(userId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // CheckGroupMembership
  // =========================================================================

  describe('CheckGroupMembershipUseCase', () => {
    it('should return true when user belongs to the group (by id)', async () => {
      userAuthRepo.seedGroup(userId, { groupId: 'group-eng' });

      const result = await checkGroupMembership.execute(userId, 'group-eng');

      expect(result).toBe(true);
    });

    it('should return true when user belongs to the group (by name)', async () => {
      userAuthRepo.seedGroup(userId, { groupId: 'group-eng' });

      const result = await checkGroupMembership.execute(userId, 'engineering');

      expect(result).toBe(true);
    });

    it('should return false when user does not belong to the group', async () => {
      const result = await checkGroupMembership.execute(userId, 'engineering');

      expect(result).toBe(false);
    });

    it('should return false for a non-existent group name', async () => {
      userAuthRepo.seedGroup(userId, { groupId: 'group-eng' });

      const result = await checkGroupMembership.execute(userId, 'nonexistent');

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // CheckLastAdmin
  // =========================================================================

  describe('CheckLastAdminUseCase', () => {
    it('should return true when user is the only admin', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-admin' });
      userAuthRepo.setRoleNameCount('admin', 1);

      const result = await checkLastAdmin.execute(userId);

      expect(result).toBe(true);
    });

    it('should return false when there are multiple admins', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-admin' });
      userAuthRepo.setRoleNameCount('admin', 3);

      const result = await checkLastAdmin.execute(userId);

      expect(result).toBe(false);
    });

    it('should return false when user is not an admin at all', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });
      userAuthRepo.setRoleNameCount('admin', 1);

      const result = await checkLastAdmin.execute(userId);

      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // GetAllPermissions
  // =========================================================================

  describe('GetAllPermissionsUseCase', () => {
    it('should return all granted permission keys for the user', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });
      userAuthRepo.seedPermission(userId, { permissionId: 'perm-4', granted: true });

      const keys = await getAllPermissions.execute(userId);

      expect(keys).toContain('resume:read');
      expect(keys).toContain('resume:write');
      expect(keys).toContain('export:pdf');
    });

    it('should return an empty array for a user with no permissions', async () => {
      const keys = await getAllPermissions.execute(userId);

      expect(keys).toEqual([]);
    });

    it('should not include denied permissions in the result', async () => {
      userAuthRepo.seedPermission(userId, { permissionId: 'perm-1', granted: false });

      const keys = await getAllPermissions.execute(userId);

      expect(keys).not.toContain('resume:read');
    });
  });

  // =========================================================================
  // GetResourcePermissions
  // =========================================================================

  describe('GetResourcePermissionsUseCase', () => {
    it('should return actions for a specific resource', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const actions = await getResourcePermissions.execute(userId, 'resume');

      expect(actions).toContain('read');
      expect(actions).toContain('write');
      expect(actions).not.toContain('delete');
    });

    it('should return an empty array when user has no permissions on resource', async () => {
      const actions = await getResourcePermissions.execute(userId, 'resume');

      expect(actions).toEqual([]);
    });

    it('should return an empty array for an unknown resource', async () => {
      userAuthRepo.seedRole(userId, { roleId: 'role-editor' });

      const actions = await getResourcePermissions.execute(userId, 'unknown_resource');

      expect(actions).toEqual([]);
    });
  });

  // =========================================================================
  // CountUsersWithRole
  // =========================================================================

  describe('CountUsersWithRoleUseCase', () => {
    it('should return the count of users with the given role name', async () => {
      userAuthRepo.setRoleNameCount('admin', 5);

      const count = await countUsersWithRole.execute('admin');

      expect(count).toBe(5);
    });

    it('should return 0 for a role with no users', async () => {
      const count = await countUsersWithRole.execute('nonexistent');

      expect(count).toBe(0);
    });
  });

  // =========================================================================
  // Group Inheritance (integration-level via in-memory repos)
  // =========================================================================

  describe('Group inheritance', () => {
    it('should grant direct permissions from parent group via ancestor resolution', async () => {
      // user is in platform (child of engineering)
      userAuthRepo.seedGroup(userId, { groupId: 'group-platform' });

      const ctx = await getAuthContext.execute(userId);

      // Direct group permission on platform (resume:delete via perm-3)
      expect(ctx.hasPermission('resume', 'delete')).toBe(true);
      // Inherited direct permission from engineering parent (export:pdf via perm-4)
      expect(ctx.hasPermission('export', 'pdf')).toBe(true);
    });

    it('should grant group role permissions when user also holds the role', async () => {
      // user is in engineering and also has the viewer role directly
      userAuthRepo.seedGroup(userId, { groupId: 'group-eng' });
      userAuthRepo.seedRole(userId, { roleId: 'role-viewer' });

      const ctx = await getAuthContext.execute(userId);

      // viewer role grants resume:read (via role and via group-role matching)
      expect(ctx.hasPermission('resume', 'read')).toBe(true);
      // engineering group direct permission
      expect(ctx.hasPermission('export', 'pdf')).toBe(true);
    });

    it('should not grant permissions from child groups to parent members', async () => {
      // user is in engineering only (parent)
      userAuthRepo.seedGroup(userId, { groupId: 'group-eng' });

      const ctx = await getAuthContext.execute(userId);

      // Engineering group has export:pdf as direct permission
      expect(ctx.hasPermission('export', 'pdf')).toBe(true);
      // resume:delete comes from platform (child) -- should NOT be inherited upward
      expect(ctx.hasPermission('resume', 'delete')).toBe(false);
    });
  });
});
