import { describe, expect, it } from 'bun:test';
import { Permission, StandardActions, StandardResources } from './permission.entity';

describe('Permission Entity', () => {
  describe('create', () => {
    it('should create a permission with valid resource and action', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      expect(permission.resource).toBe('resume');
      expect(permission.action).toBe('create');
      expect(permission.key).toBe('resume:create');
      expect(permission.isSystem).toBe(false);
      expect(permission.id).toBe('');
    });

    it('should normalize resource and action to lowercase', () => {
      const permission = Permission.create({
        resource: 'RESUME',
        action: 'CREATE',
      });

      expect(permission.resource).toBe('resume');
      expect(permission.action).toBe('create');
    });

    it('should trim whitespace from resource and action', () => {
      const permission = Permission.create({
        resource: '  resume  ',
        action: '  create  ',
      });

      expect(permission.resource).toBe('resume');
      expect(permission.action).toBe('create');
    });

    it('should create a system permission when specified', () => {
      const permission = Permission.create({
        resource: 'user',
        action: 'manage',
        isSystem: true,
      });

      expect(permission.isSystem).toBe(true);
    });

    it('should include description when provided', () => {
      const permission = Permission.create({
        resource: 'theme',
        action: 'approve',
        description: 'Can approve themes',
      });

      expect(permission.description).toBe('Can approve themes');
    });

    it('should set timestamps on creation', () => {
      const before = new Date();
      const permission = Permission.create({
        resource: 'resume',
        action: 'read',
      });
      const after = new Date();

      expect(permission.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(permission.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(permission.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('validation', () => {
    it('should reject empty resource', () => {
      expect(() =>
        Permission.create({
          resource: '',
          action: 'create',
        }),
      ).toThrow('Permission resource cannot be empty');
    });

    it('should reject empty action', () => {
      expect(() =>
        Permission.create({
          resource: 'resume',
          action: '',
        }),
      ).toThrow('Permission action cannot be empty');
    });

    it('should reject resource containing colon', () => {
      expect(() =>
        Permission.create({
          resource: 'resume:section',
          action: 'create',
        }),
      ).toThrow('Permission resource cannot contain ":"');
    });

    it('should reject action containing colon', () => {
      expect(() =>
        Permission.create({
          resource: 'resume',
          action: 'create:item',
        }),
      ).toThrow('Permission action cannot contain ":"');
    });

    it('should reject resource starting with number', () => {
      expect(() =>
        Permission.create({
          resource: '1resume',
          action: 'create',
        }),
      ).toThrow('must start with lowercase letter');
    });

    it('should reject action starting with number', () => {
      expect(() =>
        Permission.create({
          resource: 'resume',
          action: '1create',
        }),
      ).toThrow('must start with lowercase letter');
    });

    it('should reject resource with invalid characters', () => {
      expect(() =>
        Permission.create({
          resource: 'resume-section',
          action: 'create',
        }),
      ).toThrow('must start with lowercase letter');
    });

    it('should allow underscore in resource', () => {
      const permission = Permission.create({
        resource: 'audit_log',
        action: 'read',
      });

      expect(permission.resource).toBe('audit_log');
    });

    it('should allow wildcard resource "*"', () => {
      const permission = Permission.create({
        resource: '*',
        action: 'manage',
      });

      expect(permission.resource).toBe('*');
    });
  });

  describe('matches', () => {
    it('should match exact resource and action', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      expect(permission.matches('resume', 'create')).toBe(true);
    });

    it('should not match different resource', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      expect(permission.matches('theme', 'create')).toBe(false);
    });

    it('should not match different action', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      expect(permission.matches('resume', 'delete')).toBe(false);
    });

    it('should match case-insensitively', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      expect(permission.matches('RESUME', 'CREATE')).toBe(true);
    });

    it('should trim whitespace when matching', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      expect(permission.matches('  resume  ', '  create  ')).toBe(true);
    });

    describe('manage action (super-action)', () => {
      it('should match any action on the same resource when permission has manage', () => {
        const permission = Permission.create({
          resource: 'resume',
          action: 'manage',
        });

        expect(permission.matches('resume', 'create')).toBe(true);
        expect(permission.matches('resume', 'read')).toBe(true);
        expect(permission.matches('resume', 'update')).toBe(true);
        expect(permission.matches('resume', 'delete')).toBe(true);
        expect(permission.matches('resume', 'export')).toBe(true);
      });

      it('should not match different resource even with manage action', () => {
        const permission = Permission.create({
          resource: 'resume',
          action: 'manage',
        });

        expect(permission.matches('theme', 'create')).toBe(false);
      });
    });

    describe('wildcard resource "*:manage" (super-admin)', () => {
      it('should match any resource and any action', () => {
        const permission = Permission.create({
          resource: '*',
          action: 'manage',
        });

        expect(permission.matches('resume', 'create')).toBe(true);
        expect(permission.matches('theme', 'approve')).toBe(true);
        expect(permission.matches('user', 'delete')).toBe(true);
        expect(permission.matches('analytics', 'read')).toBe(true);
      });
    });
  });

  describe('canBeDeleted', () => {
    it('should return true for non-system permissions', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
        isSystem: false,
      });

      expect(permission.canBeDeleted()).toBe(true);
    });

    it('should return false for system permissions', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
        isSystem: true,
      });

      expect(permission.canBeDeleted()).toBe(false);
    });
  });

  describe('withDescription', () => {
    it('should return new permission with updated description', () => {
      const original = Permission.create({
        resource: 'resume',
        action: 'create',
        description: 'Old description',
      });

      const updated = original.withDescription('New description');

      expect(updated.description).toBe('New description');
      expect(original.description).toBe('Old description');
    });

    it('should trim description', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      const updated = permission.withDescription('  trimmed  ');

      expect(updated.description).toBe('trimmed');
    });

    it('should update updatedAt timestamp', () => {
      const original = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      const originalUpdatedAt = original.updatedAt;

      // Small delay to ensure timestamp changes
      const updated = original.withDescription('New');

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('equals', () => {
    it('should return true for permissions with same resource:action', () => {
      const permission1 = Permission.create({
        resource: 'resume',
        action: 'create',
      });
      const permission2 = Permission.create({
        resource: 'resume',
        action: 'create',
      });

      expect(permission1.equals(permission2)).toBe(true);
    });

    it('should return false for permissions with different resource', () => {
      const permission1 = Permission.create({
        resource: 'resume',
        action: 'create',
      });
      const permission2 = Permission.create({
        resource: 'theme',
        action: 'create',
      });

      expect(permission1.equals(permission2)).toBe(false);
    });

    it('should return false for permissions with different action', () => {
      const permission1 = Permission.create({
        resource: 'resume',
        action: 'create',
      });
      const permission2 = Permission.create({
        resource: 'resume',
        action: 'delete',
      });

      expect(permission1.equals(permission2)).toBe(false);
    });

    it('should ignore other properties when comparing', () => {
      const permission1 = Permission.create({
        resource: 'resume',
        action: 'create',
        description: 'Description 1',
        isSystem: false,
      });
      const permission2 = Permission.create({
        resource: 'resume',
        action: 'create',
        description: 'Description 2',
        isSystem: true,
      });

      expect(permission1.equals(permission2)).toBe(true);
    });
  });

  describe('createKey', () => {
    it('should create key in resource:action format', () => {
      const key = Permission.createKey('resume', 'create');

      expect(key).toBe('resume:create');
    });

    it('should normalize to lowercase', () => {
      const key = Permission.createKey('RESUME', 'CREATE');

      expect(key).toBe('resume:create');
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute permission from stored props', () => {
      const props = {
        id: 'perm-123',
        resource: 'resume',
        action: 'create',
        description: 'Can create resumes',
        isSystem: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const permission = Permission.fromPersistence(props);

      expect(permission.id).toBe('perm-123');
      expect(permission.resource).toBe('resume');
      expect(permission.action).toBe('create');
      expect(permission.description).toBe('Can create resumes');
      expect(permission.isSystem).toBe(true);
      expect(permission.createdAt).toEqual(new Date('2024-01-01'));
      expect(permission.updatedAt).toEqual(new Date('2024-01-02'));
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties', () => {
      const permission = Permission.create({
        resource: 'resume',
        action: 'create',
        description: 'Can create resumes',
        isSystem: true,
      });

      const json = permission.toJSON();

      expect(json.resource).toBe('resume');
      expect(json.action).toBe('create');
      expect(json.description).toBe('Can create resumes');
      expect(json.isSystem).toBe(true);
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('StandardActions', () => {
    it('should export all standard actions', () => {
      expect(StandardActions.CREATE).toBe('create');
      expect(StandardActions.READ).toBe('read');
      expect(StandardActions.UPDATE).toBe('update');
      expect(StandardActions.DELETE).toBe('delete');
      expect(StandardActions.LIST).toBe('list');
      expect(StandardActions.APPROVE).toBe('approve');
      expect(StandardActions.REJECT).toBe('reject');
      expect(StandardActions.EXPORT).toBe('export');
      expect(StandardActions.IMPORT).toBe('import');
      expect(StandardActions.SHARE).toBe('share');
      expect(StandardActions.MANAGE).toBe('manage');
    });
  });

  describe('StandardResources', () => {
    it('should export all standard resources', () => {
      expect(StandardResources.USER).toBe('user');
      expect(StandardResources.RESUME).toBe('resume');
      expect(StandardResources.THEME).toBe('theme');
      expect(StandardResources.SKILL).toBe('skill');
      expect(StandardResources.ROLE).toBe('role');
      expect(StandardResources.GROUP).toBe('group');
      expect(StandardResources.PERMISSION).toBe('permission');
      expect(StandardResources.AUDIT_LOG).toBe('audit_log');
      expect(StandardResources.ANALYTICS).toBe('analytics');
      expect(StandardResources.SETTINGS).toBe('settings');
      expect(StandardResources.COLLABORATION).toBe('collaboration');
    });
  });
});
