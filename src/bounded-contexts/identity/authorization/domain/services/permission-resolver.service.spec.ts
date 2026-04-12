/**
 * Permission Resolver Service Tests
 *
 * Tests the domain service that aggregates permissions from
 * direct assignments, roles, and groups (with hierarchy).
 *
 * Uses in-memory repositories for behavior-focused testing.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import {
  InMemoryGroupRepository,
  InMemoryPermissionRepository,
  InMemoryRoleRepository,
  InMemoryUserAuthorizationRepository,
} from '../../testing';
import { Group } from '../entities/group.entity';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { PermissionResolverService } from './permission-resolver.service';

// ──────────────────────────────────────────────────────────────
// Test Fixtures
// ──────────────────────────────────────────────────────────────

const USER_ID = 'user-001';
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
  opts: { parentId?: string; roleIds?: string[]; permissionIds?: string[] } = {},
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

// ──────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────

describe('PermissionResolverService', () => {
  let service: PermissionResolverService;
  let permissionRepo: InMemoryPermissionRepository;
  let roleRepo: InMemoryRoleRepository;
  let groupRepo: InMemoryGroupRepository;
  let userAuthRepo: InMemoryUserAuthorizationRepository;

  beforeEach(() => {
    permissionRepo = new InMemoryPermissionRepository();
    roleRepo = new InMemoryRoleRepository();
    groupRepo = new InMemoryGroupRepository();
    userAuthRepo = new InMemoryUserAuthorizationRepository();
    service = new PermissionResolverService(permissionRepo, roleRepo, groupRepo, userAuthRepo);
  });

  describe('resolveUserContext', () => {
    it('should return empty context for user with no assignments', async () => {
      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.userId).toBe(USER_ID);
      expect(ctx.grantedPermissionKeys).toHaveLength(0);
    });

    it('should resolve direct granted permission', async () => {
      const perm = makePermission('p1', 'resume', 'create');
      permissionRepo.seed(perm);
      userAuthRepo.seedPermission(USER_ID, { permissionId: 'p1', granted: true });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('resume', 'create')).toBe(true);
      expect(ctx.grantedPermissionKeys).toContain('resume:create');
    });

    it('should resolve direct denied permission', async () => {
      const perm = makePermission('p1', 'resume', 'delete');
      permissionRepo.seed(perm);
      userAuthRepo.seedPermission(USER_ID, { permissionId: 'p1', granted: false });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('resume', 'delete')).toBe(false);
    });

    it('should resolve permissions from a role', async () => {
      const perm1 = makePermission('p1', 'resume', 'create');
      const perm2 = makePermission('p2', 'resume', 'read');
      permissionRepo.seedMany([perm1, perm2]);

      const role = makeRole('r1', 'editor', ['p1', 'p2']);
      roleRepo.seed(role);

      userAuthRepo.seedRole(USER_ID, { roleId: 'r1' });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('resume', 'create')).toBe(true);
      expect(ctx.hasPermission('resume', 'read')).toBe(true);
      expect(ctx.hasRole('r1')).toBe(true);
    });

    it('should resolve permissions from a group', async () => {
      const perm = makePermission('p1', 'theme', 'read');
      permissionRepo.seed(perm);

      const group = makeGroup('g1', 'designers', { permissionIds: ['p1'] });
      groupRepo.seed(group);

      userAuthRepo.seedGroup(USER_ID, { groupId: 'g1' });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('theme', 'read')).toBe(true);
      expect(ctx.inGroup('g1')).toBe(true);
    });

    it('should resolve permissions from group roles when user also has the role', async () => {
      const perm = makePermission('p1', 'skill', 'create');
      permissionRepo.seed(perm);

      const role = makeRole('r1', 'skill_manager', ['p1']);
      roleRepo.seed(role);

      const group = makeGroup('g1', 'engineering', { roleIds: ['r1'] });
      groupRepo.seed(group);

      // User must also have the role assigned for the resolver to find it
      userAuthRepo.seedRole(USER_ID, { roleId: 'r1' });
      userAuthRepo.seedGroup(USER_ID, { groupId: 'g1' });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('skill', 'create')).toBe(true);
    });

    it('should inherit permissions from parent group', async () => {
      const perm = makePermission('p1', 'analytics', 'read');
      permissionRepo.seed(perm);

      const parent = makeGroup('g-parent', 'company', { permissionIds: ['p1'] });
      const child = makeGroup('g-child', 'engineering', { parentId: 'g-parent' });
      groupRepo.seedMany([parent, child]);

      userAuthRepo.seedGroup(USER_ID, { groupId: 'g-child' });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('analytics', 'read')).toBe(true);
      expect(ctx.inGroup('g-parent')).toBe(true);
      expect(ctx.inGroup('g-child')).toBe(true);
    });

    it('should deny permission when directly denied even if role grants it', async () => {
      const perm = makePermission('p1', 'user', 'delete');
      permissionRepo.seed(perm);

      const role = makeRole('r1', 'admin', ['p1']);
      roleRepo.seed(role);

      userAuthRepo.seedRole(USER_ID, { roleId: 'r1' });
      userAuthRepo.seedPermission(USER_ID, { permissionId: 'p1', granted: false });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('user', 'delete')).toBe(false);
    });

    it('should exclude expired role assignments', async () => {
      const perm = makePermission('p1', 'resume', 'create');
      permissionRepo.seed(perm);

      const role = makeRole('r1', 'editor', ['p1']);
      roleRepo.seed(role);

      const pastDate = new Date('2020-01-01');
      userAuthRepo.seedRole(USER_ID, { roleId: 'r1', expiresAt: pastDate });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('resume', 'create')).toBe(false);
    });

    it('should exclude expired permission assignments', async () => {
      const perm = makePermission('p1', 'resume', 'create');
      permissionRepo.seed(perm);

      const pastDate = new Date('2020-01-01');
      userAuthRepo.seedPermission(USER_ID, {
        permissionId: 'p1',
        granted: true,
        expiresAt: pastDate,
      });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('resume', 'create')).toBe(false);
    });

    it('should exclude expired group memberships', async () => {
      const perm = makePermission('p1', 'theme', 'read');
      permissionRepo.seed(perm);

      const group = makeGroup('g1', 'designers', { permissionIds: ['p1'] });
      groupRepo.seed(group);

      const pastDate = new Date('2020-01-01');
      userAuthRepo.seedGroup(USER_ID, { groupId: 'g1', expiresAt: pastDate });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('theme', 'read')).toBe(false);
    });

    it('should aggregate permissions from multiple sources', async () => {
      const perm1 = makePermission('p1', 'resume', 'create');
      const perm2 = makePermission('p2', 'resume', 'read');
      const perm3 = makePermission('p3', 'theme', 'read');
      permissionRepo.seedMany([perm1, perm2, perm3]);

      const role = makeRole('r1', 'editor', ['p1']);
      roleRepo.seed(role);

      const group = makeGroup('g1', 'readers', { permissionIds: ['p3'] });
      groupRepo.seed(group);

      userAuthRepo.seedRole(USER_ID, { roleId: 'r1' });
      userAuthRepo.seedPermission(USER_ID, { permissionId: 'p2', granted: true });
      userAuthRepo.seedGroup(USER_ID, { groupId: 'g1' });

      const ctx = await service.resolveUserContext(USER_ID);

      expect(ctx.hasPermission('resume', 'create')).toBe(true);
      expect(ctx.hasPermission('resume', 'read')).toBe(true);
      expect(ctx.hasPermission('theme', 'read')).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return true for direct granted permission', async () => {
      const perm = makePermission('p1', 'resume', 'create');
      permissionRepo.seed(perm);
      userAuthRepo.seedPermission(USER_ID, { permissionId: 'p1', granted: true });

      const result = await service.hasPermission(USER_ID, 'resume', 'create');

      expect(result).toBe(true);
    });

    it('should return false for direct denied permission', async () => {
      const perm = makePermission('p1', 'resume', 'delete');
      permissionRepo.seed(perm);
      userAuthRepo.seedPermission(USER_ID, { permissionId: 'p1', granted: false });

      const result = await service.hasPermission(USER_ID, 'resume', 'delete');

      expect(result).toBe(false);
    });

    it('should fall back to resolveUserContext for role-based permissions', async () => {
      const perm = makePermission('p1', 'resume', 'create');
      permissionRepo.seed(perm);

      const role = makeRole('r1', 'editor', ['p1']);
      roleRepo.seed(role);
      userAuthRepo.seedRole(USER_ID, { roleId: 'r1' });

      const result = await service.hasPermission(USER_ID, 'resume', 'create');

      expect(result).toBe(true);
    });

    it('should return null-path (false) for unknown permission key', async () => {
      const result = await service.hasPermission(USER_ID, 'nonexistent', 'action');

      expect(result).toBe(false);
    });

    it('should skip expired direct permission and fall through', async () => {
      const perm = makePermission('p1', 'resume', 'create');
      permissionRepo.seed(perm);

      const pastDate = new Date('2020-01-01');
      userAuthRepo.seedPermission(USER_ID, {
        permissionId: 'p1',
        granted: true,
        expiresAt: pastDate,
      });

      const result = await service.hasPermission(USER_ID, 'resume', 'create');

      expect(result).toBe(false);
    });
  });
});
