import { describe, expect, it } from 'bun:test';
import { Permission } from './permission.entity';
import { type ResolvedPermission, UserAuthContext } from './user-auth-context.entity';

// Helper to create resolved permissions for testing
function createResolvedPermission(
  resource: string,
  action: string,
  granted = true,
): ResolvedPermission {
  return {
    permission: Permission.create({ resource, action }),
    sources: [{ type: 'direct', sourceId: 'test', sourceName: 'Test', inherited: false }],
    granted,
  };
}

describe('UserAuthContext Entity', () => {
  describe('empty', () => {
    it('should create an empty context with no permissions', () => {
      const context = UserAuthContext.empty('user-123');

      expect(context.userId).toBe('user-123');
      expect(context.roleIds.size).toBe(0);
      expect(context.groupIds.size).toBe(0);
      expect(context.grantedPermissionKeys).toEqual([]);
    });

    it('should set resolvedAt to current time', () => {
      const before = new Date();
      const context = UserAuthContext.empty('user-123');
      const after = new Date();

      expect(context.resolvedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(context.resolvedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('create', () => {
    it('should create a context with roles, groups, and permissions', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2'],
        groupIds: ['group-1'],
        permissions: [
          createResolvedPermission('resume', 'create'),
          createResolvedPermission('resume', 'read'),
        ],
      });

      expect(context.userId).toBe('user-123');
      expect(context.roleIds.size).toBe(2);
      expect(context.groupIds.size).toBe(1);
      expect(context.grantedPermissionKeys).toContain('resume:create');
      expect(context.grantedPermissionKeys).toContain('resume:read');
    });

    it('should handle denied permissions', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [
          createResolvedPermission('resume', 'create', true),
          createResolvedPermission('resume', 'delete', false), // denied
        ],
      });

      expect(context.grantedPermissionKeys).toContain('resume:create');
      expect(context.grantedPermissionKeys).not.toContain('resume:delete');
    });
  });

  describe('hasPermission', () => {
    it('should return true for granted permission', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [createResolvedPermission('resume', 'create')],
      });

      expect(context.hasPermission('resume', 'create')).toBe(true);
    });

    it('should return false for missing permission', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [createResolvedPermission('resume', 'create')],
      });

      expect(context.hasPermission('resume', 'delete')).toBe(false);
    });

    it('should return false for denied permission', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [createResolvedPermission('resume', 'delete', false)],
      });

      expect(context.hasPermission('resume', 'delete')).toBe(false);
    });

    it('should be case-insensitive', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [createResolvedPermission('resume', 'create')],
      });

      expect(context.hasPermission('RESUME', 'CREATE')).toBe(true);
      expect(context.hasPermission('Resume', 'Create')).toBe(true);
    });

    describe('resource:manage (implies all actions)', () => {
      it('should grant any action on resource if user has manage permission', () => {
        const context = UserAuthContext.create({
          userId: 'user-123',
          roleIds: [],
          groupIds: [],
          permissions: [createResolvedPermission('resume', 'manage')],
        });

        expect(context.hasPermission('resume', 'create')).toBe(true);
        expect(context.hasPermission('resume', 'read')).toBe(true);
        expect(context.hasPermission('resume', 'update')).toBe(true);
        expect(context.hasPermission('resume', 'delete')).toBe(true);
        expect(context.hasPermission('resume', 'export')).toBe(true);
      });

      it('should not grant permissions on different resource', () => {
        const context = UserAuthContext.create({
          userId: 'user-123',
          roleIds: [],
          groupIds: [],
          permissions: [createResolvedPermission('resume', 'manage')],
        });

        expect(context.hasPermission('theme', 'create')).toBe(false);
        expect(context.hasPermission('user', 'delete')).toBe(false);
      });
    });

    describe('*:manage (super-admin)', () => {
      it('should grant any action on any resource if user has *:manage', () => {
        const context = UserAuthContext.create({
          userId: 'user-123',
          roleIds: [],
          groupIds: [],
          permissions: [createResolvedPermission('*', 'manage')],
        });

        expect(context.hasPermission('resume', 'create')).toBe(true);
        expect(context.hasPermission('theme', 'approve')).toBe(true);
        expect(context.hasPermission('user', 'delete')).toBe(true);
        expect(context.hasPermission('analytics', 'read')).toBe(true);
        expect(context.hasPermission('anything', 'whatever')).toBe(true);
      });
    });

    describe('permission priority', () => {
      it('should check explicit permission before wildcards', () => {
        const context = UserAuthContext.create({
          userId: 'user-123',
          roleIds: [],
          groupIds: [],
          permissions: [
            createResolvedPermission('resume', 'create', true),
            createResolvedPermission('resume', 'manage', false), // denied
          ],
        });

        // Explicit permission takes precedence
        expect(context.hasPermission('resume', 'create')).toBe(true);
      });
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if user has at least one permission', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [createResolvedPermission('resume', 'read')],
      });

      expect(
        context.hasAnyPermission([
          { resource: 'resume', action: 'create' },
          { resource: 'resume', action: 'read' },
        ]),
      ).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [createResolvedPermission('resume', 'read')],
      });

      expect(
        context.hasAnyPermission([
          { resource: 'resume', action: 'create' },
          { resource: 'resume', action: 'delete' },
        ]),
      ).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if user has all permissions', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [
          createResolvedPermission('resume', 'create'),
          createResolvedPermission('resume', 'read'),
        ],
      });

      expect(
        context.hasAllPermissions([
          { resource: 'resume', action: 'create' },
          { resource: 'resume', action: 'read' },
        ]),
      ).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [createResolvedPermission('resume', 'create')],
      });

      expect(
        context.hasAllPermissions([
          { resource: 'resume', action: 'create' },
          { resource: 'resume', action: 'delete' },
        ]),
      ).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has the role', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2'],
        groupIds: [],
        permissions: [],
      });

      expect(context.hasRole('role-1')).toBe(true);
    });

    it('should return false if user does not have the role', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: ['role-1'],
        groupIds: [],
        permissions: [],
      });

      expect(context.hasRole('role-3')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true if user has at least one role', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: ['role-1'],
        groupIds: [],
        permissions: [],
      });

      expect(context.hasAnyRole(['role-1', 'role-2'])).toBe(true);
    });

    it('should return false if user has none of the roles', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: ['role-1'],
        groupIds: [],
        permissions: [],
      });

      expect(context.hasAnyRole(['role-2', 'role-3'])).toBe(false);
    });
  });

  describe('inGroup', () => {
    it('should return true if user is in the group', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: ['group-1', 'group-2'],
        permissions: [],
      });

      expect(context.inGroup('group-1')).toBe(true);
    });

    it('should return false if user is not in the group', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: ['group-1'],
        permissions: [],
      });

      expect(context.inGroup('group-3')).toBe(false);
    });
  });

  describe('inAnyGroup', () => {
    it('should return true if user is in at least one group', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: ['group-1'],
        permissions: [],
      });

      expect(context.inAnyGroup(['group-1', 'group-2'])).toBe(true);
    });

    it('should return false if user is in none of the groups', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: ['group-1'],
        permissions: [],
      });

      expect(context.inAnyGroup(['group-2', 'group-3'])).toBe(false);
    });
  });

  describe('getPermissionSources', () => {
    it('should return sources for a permission', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [
          {
            permission: Permission.create({ resource: 'resume', action: 'create' }),
            sources: [
              { type: 'direct', sourceId: 'user-123', sourceName: 'Direct', inherited: false },
              { type: 'role', sourceId: 'role-1', sourceName: 'Admin', inherited: false },
            ],
            granted: true,
          },
        ],
      });

      const sources = context.getPermissionSources('resume', 'create');

      expect(sources).toHaveLength(2);
      expect(sources[0].type).toBe('direct');
      expect(sources[1].type).toBe('role');
    });

    it('should return empty array for missing permission', () => {
      const context = UserAuthContext.empty('user-123');

      const sources = context.getPermissionSources('resume', 'create');

      expect(sources).toEqual([]);
    });
  });

  describe('getResourcePermissions', () => {
    it('should return all granted permissions for a resource', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [
          createResolvedPermission('resume', 'create'),
          createResolvedPermission('resume', 'read'),
          createResolvedPermission('resume', 'delete', false), // denied
          createResolvedPermission('theme', 'create'), // different resource
        ],
      });

      const perms = context.getResourcePermissions('resume');

      expect(perms).toHaveLength(2);
      expect(perms.map((p) => p.permission.action)).toContain('create');
      expect(perms.map((p) => p.permission.action)).toContain('read');
    });

    it('should be case-insensitive', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [createResolvedPermission('resume', 'create')],
      });

      const perms = context.getResourcePermissions('RESUME');

      expect(perms).toHaveLength(1);
    });
  });

  describe('isStale', () => {
    it('should return false if context is fresh', () => {
      const context = UserAuthContext.empty('user-123');

      // 60 seconds is plenty of time - context was just created
      expect(context.isStale(60)).toBe(false);
    });

    it('should return false if context age is within maxAgeSeconds', () => {
      const context = UserAuthContext.empty('user-123');

      // Context was just created, so even 1 second should be enough
      expect(context.isStale(1)).toBe(false);
    });

    it('should calculate staleness based on resolvedAt timestamp', () => {
      const context = UserAuthContext.empty('user-123');

      // Verify the context has a valid resolvedAt
      expect(context.resolvedAt).toBeInstanceOf(Date);

      // A freshly created context with a very long max age should not be stale
      expect(context.isStale(3600)).toBe(false);

      // A freshly created context checked immediately with -1 seconds should be stale
      // (negative max age means it's always stale)
      expect(context.isStale(-1)).toBe(true);
    });
  });

  describe('grantedPermissionKeys', () => {
    it('should return only granted permission keys', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: [],
        groupIds: [],
        permissions: [
          createResolvedPermission('resume', 'create', true),
          createResolvedPermission('resume', 'delete', false),
          createResolvedPermission('theme', 'read', true),
        ],
      });

      const keys = context.grantedPermissionKeys;

      expect(keys).toContain('resume:create');
      expect(keys).toContain('theme:read');
      expect(keys).not.toContain('resume:delete');
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: ['role-1', 'role-2'],
        groupIds: ['group-1'],
        permissions: [
          createResolvedPermission('resume', 'create'),
          createResolvedPermission('resume', 'read'),
        ],
      });

      const json = context.toJSON();

      expect(json.userId).toBe('user-123');
      expect(json.roleIds).toContain('role-1');
      expect(json.roleIds).toContain('role-2');
      expect(json.groupIds).toContain('group-1');
      expect(json.permissions).toContain('resume:create');
      expect(json.permissions).toContain('resume:read');
      expect(typeof json.resolvedAt).toBe('string');
    });
  });

  describe('immutability', () => {
    it('should return readonly sets for roleIds and groupIds', () => {
      const context = UserAuthContext.create({
        userId: 'user-123',
        roleIds: ['role-1'],
        groupIds: ['group-1'],
        permissions: [],
      });

      // TypeScript should prevent modification, but we can verify the values
      expect(context.roleIds.has('role-1')).toBe(true);
      expect(context.groupIds.has('group-1')).toBe(true);
    });
  });
});
