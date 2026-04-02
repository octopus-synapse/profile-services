import { describe, expect, it } from 'bun:test';
import { Permission } from '../entities/permission.entity';
import { PermissionCollector } from './permission-collector';

describe('PermissionCollector', () => {
  // Helper to create a permission map for resolution
  function createPermissionMap(
    permissions: Array<{ id: string; resource: string; action: string }>,
  ): Map<string, Permission> {
    const map = new Map<string, Permission>();
    for (const p of permissions) {
      const permission = Permission.fromPersistence({
        id: p.id,
        resource: p.resource,
        action: p.action,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      map.set(p.id, permission);
    }
    return map;
  }

  describe('addDirect', () => {
    it('should add a granted direct permission', () => {
      const collector = new PermissionCollector();

      collector.addDirect('perm-1', true, 'user-123');

      expect(collector.getAllPermissionIds()).toContain('perm-1');
    });

    it('should add a denied direct permission', () => {
      const collector = new PermissionCollector();

      collector.addDirect('perm-1', false, 'user-123');

      expect(collector.getAllPermissionIds()).toContain('perm-1');
    });

    it('should track source as direct assignment', () => {
      const collector = new PermissionCollector();
      collector.addDirect('perm-1', true, 'user-123');

      const permissionMap = createPermissionMap([
        { id: 'perm-1', resource: 'resume', action: 'create' },
      ]);
      const resolved = collector.resolve(permissionMap);

      expect(resolved[0].sources[0].type).toBe('direct');
      expect(resolved[0].sources[0].sourceId).toBe('user-123');
      expect(resolved[0].sources[0].sourceName).toBe('Direct Assignment');
      expect(resolved[0].sources[0].inherited).toBe(false);
    });
  });

  describe('addFromRole', () => {
    it('should add permission from role', () => {
      const collector = new PermissionCollector();

      collector.addFromRole('perm-1', 'role-1', 'Admin');

      expect(collector.getAllPermissionIds()).toContain('perm-1');
    });

    it('should track source as role', () => {
      const collector = new PermissionCollector();
      collector.addFromRole('perm-1', 'role-1', 'Admin');

      const permissionMap = createPermissionMap([
        { id: 'perm-1', resource: 'resume', action: 'create' },
      ]);
      const resolved = collector.resolve(permissionMap);

      expect(resolved[0].sources[0].type).toBe('role');
      expect(resolved[0].sources[0].sourceId).toBe('role-1');
      expect(resolved[0].sources[0].sourceName).toBe('Admin');
      expect(resolved[0].sources[0].inherited).toBe(false);
    });
  });

  describe('addFromGroup', () => {
    it('should add permission from group', () => {
      const collector = new PermissionCollector();

      collector.addFromGroup('perm-1', 'group-1', 'Developers', false);

      expect(collector.getAllPermissionIds()).toContain('perm-1');
    });

    it('should track inherited flag for group permissions', () => {
      const collector = new PermissionCollector();
      collector.addFromGroup('perm-1', 'group-1', 'Developers', true);

      const permissionMap = createPermissionMap([
        { id: 'perm-1', resource: 'resume', action: 'create' },
      ]);
      const resolved = collector.resolve(permissionMap);

      expect(resolved[0].sources[0].type).toBe('group');
      expect(resolved[0].sources[0].sourceId).toBe('group-1');
      expect(resolved[0].sources[0].sourceName).toBe('Developers');
      expect(resolved[0].sources[0].inherited).toBe(true);
    });

    it('should track non-inherited flag for direct group permissions', () => {
      const collector = new PermissionCollector();
      collector.addFromGroup('perm-1', 'group-1', 'Developers', false);

      const permissionMap = createPermissionMap([
        { id: 'perm-1', resource: 'resume', action: 'create' },
      ]);
      const resolved = collector.resolve(permissionMap);

      expect(resolved[0].sources[0].inherited).toBe(false);
    });
  });

  describe('getAllPermissionIds', () => {
    it('should return empty array when no permissions added', () => {
      const collector = new PermissionCollector();

      expect(collector.getAllPermissionIds()).toEqual([]);
    });

    it('should return all unique permission IDs', () => {
      const collector = new PermissionCollector();
      collector.addDirect('perm-1', true, 'user-123');
      collector.addFromRole('perm-2', 'role-1', 'Admin');
      collector.addFromGroup('perm-3', 'group-1', 'Devs', false);

      const ids = collector.getAllPermissionIds();

      expect(ids).toContain('perm-1');
      expect(ids).toContain('perm-2');
      expect(ids).toContain('perm-3');
      expect(ids).toHaveLength(3);
    });

    it('should not duplicate permission IDs from multiple sources', () => {
      const collector = new PermissionCollector();
      collector.addDirect('perm-1', true, 'user-123');
      collector.addFromRole('perm-1', 'role-1', 'Admin');

      const ids = collector.getAllPermissionIds();

      expect(ids).toHaveLength(1);
    });
  });

  describe('resolve', () => {
    it('should resolve permissions using the permission map', () => {
      const collector = new PermissionCollector();
      collector.addDirect('perm-1', true, 'user-123');

      const permissionMap = createPermissionMap([
        { id: 'perm-1', resource: 'resume', action: 'create' },
      ]);
      const resolved = collector.resolve(permissionMap);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].permission.resource).toBe('resume');
      expect(resolved[0].permission.action).toBe('create');
      expect(resolved[0].granted).toBe(true);
    });

    it('should skip permissions not in the map', () => {
      const collector = new PermissionCollector();
      collector.addDirect('perm-1', true, 'user-123');
      collector.addDirect('perm-2', true, 'user-123');

      // Only include perm-1 in the map
      const permissionMap = createPermissionMap([
        { id: 'perm-1', resource: 'resume', action: 'create' },
      ]);
      const resolved = collector.resolve(permissionMap);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].permission.id).toBe('perm-1');
    });

    it('should aggregate sources from multiple contributions', () => {
      const collector = new PermissionCollector();
      collector.addDirect('perm-1', true, 'user-123');
      collector.addFromRole('perm-1', 'role-1', 'Admin');
      collector.addFromGroup('perm-1', 'group-1', 'Devs', false);

      const permissionMap = createPermissionMap([
        { id: 'perm-1', resource: 'resume', action: 'create' },
      ]);
      const resolved = collector.resolve(permissionMap);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].sources).toHaveLength(3);
      expect(resolved[0].sources.map((s) => s.type)).toContain('direct');
      expect(resolved[0].sources.map((s) => s.type)).toContain('role');
      expect(resolved[0].sources.map((s) => s.type)).toContain('group');
    });
  });

  describe('priority rules', () => {
    describe('direct denial takes precedence', () => {
      it('should deny permission if direct denial exists', () => {
        const collector = new PermissionCollector();
        collector.addDirect('perm-1', false, 'user-123'); // denied

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
        ]);
        const resolved = collector.resolve(permissionMap);

        expect(resolved[0].granted).toBe(false);
      });

      it('should deny even if role grants the permission', () => {
        const collector = new PermissionCollector();
        collector.addDirect('perm-1', false, 'user-123'); // denied
        collector.addFromRole('perm-1', 'role-1', 'Admin'); // would grant

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
        ]);
        const resolved = collector.resolve(permissionMap);

        expect(resolved[0].granted).toBe(false);
      });

      it('should deny even if group grants the permission', () => {
        const collector = new PermissionCollector();
        collector.addDirect('perm-1', false, 'user-123'); // denied
        collector.addFromGroup('perm-1', 'group-1', 'Devs', false); // would grant

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
        ]);
        const resolved = collector.resolve(permissionMap);

        expect(resolved[0].granted).toBe(false);
      });

      it('should deny even if direct grant came first', () => {
        const collector = new PermissionCollector();
        collector.addDirect('perm-1', true, 'user-123'); // granted first
        collector.addDirect('perm-1', false, 'admin-456'); // then denied

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
        ]);
        const resolved = collector.resolve(permissionMap);

        expect(resolved[0].granted).toBe(false);
      });
    });

    describe('direct grant takes precedence over role/group', () => {
      it('should grant permission from direct assignment', () => {
        const collector = new PermissionCollector();
        collector.addDirect('perm-1', true, 'user-123');

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
        ]);
        const resolved = collector.resolve(permissionMap);

        expect(resolved[0].granted).toBe(true);
      });
    });

    describe('role grant works without denial', () => {
      it('should grant permission from role', () => {
        const collector = new PermissionCollector();
        collector.addFromRole('perm-1', 'role-1', 'Admin');

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
        ]);
        const resolved = collector.resolve(permissionMap);

        expect(resolved[0].granted).toBe(true);
      });
    });

    describe('group grant works without denial', () => {
      it('should grant permission from group', () => {
        const collector = new PermissionCollector();
        collector.addFromGroup('perm-1', 'group-1', 'Developers', false);

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
        ]);
        const resolved = collector.resolve(permissionMap);

        expect(resolved[0].granted).toBe(true);
      });

      it('should grant permission from inherited group', () => {
        const collector = new PermissionCollector();
        collector.addFromGroup('perm-1', 'group-parent', 'All Employees', true);

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
        ]);
        const resolved = collector.resolve(permissionMap);

        expect(resolved[0].granted).toBe(true);
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple permissions with mixed sources', () => {
        const collector = new PermissionCollector();

        // perm-1: granted from multiple sources
        collector.addDirect('perm-1', true, 'user-123');
        collector.addFromRole('perm-1', 'role-1', 'Admin');

        // perm-2: denied directly
        collector.addDirect('perm-2', false, 'user-123');
        collector.addFromRole('perm-2', 'role-1', 'Admin');

        // perm-3: only from group
        collector.addFromGroup('perm-3', 'group-1', 'Devs', false);

        const permissionMap = createPermissionMap([
          { id: 'perm-1', resource: 'resume', action: 'create' },
          { id: 'perm-2', resource: 'resume', action: 'delete' },
          { id: 'perm-3', resource: 'theme', action: 'read' },
        ]);
        const resolved = collector.resolve(permissionMap);

        const perm1 = resolved.find((r) => r.permission.id === 'perm-1');
        const perm2 = resolved.find((r) => r.permission.id === 'perm-2');
        const perm3 = resolved.find((r) => r.permission.id === 'perm-3');

        expect(perm1?.granted).toBe(true);
        expect(perm1?.sources).toHaveLength(2);

        expect(perm2?.granted).toBe(false);
        expect(perm2?.sources).toHaveLength(2);

        expect(perm3?.granted).toBe(true);
        expect(perm3?.sources).toHaveLength(1);
      });
    });
  });
});
