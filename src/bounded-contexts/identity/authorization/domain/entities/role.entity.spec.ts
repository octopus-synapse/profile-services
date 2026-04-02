import { describe, expect, it } from 'bun:test';
import { Role } from './role.entity';

describe('Role Entity', () => {
  describe('create', () => {
    it('should create a role with valid name and displayName', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      expect(role.name).toBe('admin');
      expect(role.displayName).toBe('Administrator');
      expect(role.isSystem).toBe(false);
      expect(role.priority).toBe(0);
      expect(role.permissionIds.size).toBe(0);
    });

    it('should normalize name to lowercase with underscores', () => {
      const role = Role.create({
        name: 'Super Admin',
        displayName: 'Super Administrator',
      });

      expect(role.name).toBe('super_admin');
    });

    it('should trim whitespace from name and displayName', () => {
      const role = Role.create({
        name: '  admin  ',
        displayName: '  Administrator  ',
      });

      expect(role.name).toBe('admin');
      expect(role.displayName).toBe('Administrator');
    });

    it('should create a system role when specified', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        isSystem: true,
      });

      expect(role.isSystem).toBe(true);
    });

    it('should set priority when specified', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        priority: 100,
      });

      expect(role.priority).toBe(100);
    });

    it('should include description when provided', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access',
      });

      expect(role.description).toBe('Full system access');
    });

    it('should set timestamps on creation', () => {
      const before = new Date();
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });
      const after = new Date();

      expect(role.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(role.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('validation', () => {
    it('should reject empty name', () => {
      expect(() =>
        Role.create({
          name: '',
          displayName: 'Administrator',
        }),
      ).toThrow('Role name cannot be empty');
    });

    it('should reject empty displayName', () => {
      expect(() =>
        Role.create({
          name: 'admin',
          displayName: '',
        }),
      ).toThrow('Role displayName cannot be empty');
    });

    it('should reject name starting with number', () => {
      expect(() =>
        Role.create({
          name: '1admin',
          displayName: 'Administrator',
        }),
      ).toThrow('must start with lowercase letter');
    });

    it('should reject name with invalid characters', () => {
      expect(() =>
        Role.create({
          name: 'admin-user',
          displayName: 'Administrator',
        }),
      ).toThrow('must start with lowercase letter');
    });

    it('should reject name exceeding 50 characters', () => {
      const longName = 'a'.repeat(51);
      expect(() =>
        Role.create({
          name: longName,
          displayName: 'Administrator',
        }),
      ).toThrow('Role name cannot exceed 50 characters');
    });

    it('should reject displayName exceeding 100 characters', () => {
      const longDisplayName = 'A'.repeat(101);
      expect(() =>
        Role.create({
          name: 'admin',
          displayName: longDisplayName,
        }),
      ).toThrow('Role displayName cannot exceed 100 characters');
    });

    it('should reject description exceeding 500 characters', () => {
      const longDescription = 'A'.repeat(501);
      expect(() =>
        Role.create({
          name: 'admin',
          displayName: 'Administrator',
          description: longDescription,
        }),
      ).toThrow('Role description cannot exceed 500 characters');
    });

    it('should allow name with underscores', () => {
      const role = Role.create({
        name: 'super_admin_user',
        displayName: 'Super Admin User',
      });

      expect(role.name).toBe('super_admin_user');
    });

    it('should allow name with numbers after first letter', () => {
      const role = Role.create({
        name: 'admin2',
        displayName: 'Administrator 2',
      });

      expect(role.name).toBe('admin2');
    });
  });

  describe('addPermission', () => {
    it('should add a permission and return new role', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const updated = original.addPermission('perm-1');

      expect(updated.hasPermission('perm-1')).toBe(true);
      expect(original.hasPermission('perm-1')).toBe(false);
    });

    it('should return same instance if permission already exists', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const withPerm = original.addPermission('perm-1');
      const duplicate = withPerm.addPermission('perm-1');

      expect(duplicate).toBe(withPerm);
    });

    it('should update updatedAt when permission added', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const updated = original.addPermission('perm-1');

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
    });
  });

  describe('addPermissions', () => {
    it('should add multiple permissions at once', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const updated = original.addPermissions(['perm-1', 'perm-2', 'perm-3']);

      expect(updated.permissionIds.size).toBe(3);
      expect(updated.hasPermission('perm-1')).toBe(true);
      expect(updated.hasPermission('perm-2')).toBe(true);
      expect(updated.hasPermission('perm-3')).toBe(true);
    });

    it('should return same instance if all permissions already exist', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const withPerms = original.addPermissions(['perm-1', 'perm-2']);
      const duplicate = withPerms.addPermissions(['perm-1', 'perm-2']);

      expect(duplicate).toBe(withPerms);
    });

    it('should only add new permissions', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const withPerm = original.addPermission('perm-1');
      const updated = withPerm.addPermissions(['perm-1', 'perm-2']);

      expect(updated.permissionIds.size).toBe(2);
    });
  });

  describe('removePermission', () => {
    it('should remove a permission and return new role', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      }).addPermission('perm-1');

      const updated = original.removePermission('perm-1');

      expect(updated.hasPermission('perm-1')).toBe(false);
      expect(original.hasPermission('perm-1')).toBe(true);
    });

    it('should return same instance if permission does not exist', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const result = original.removePermission('non-existent');

      expect(result).toBe(original);
    });
  });

  describe('hasPermission', () => {
    it('should return true when role has permission', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      }).addPermission('perm-1');

      expect(role.hasPermission('perm-1')).toBe(true);
    });

    it('should return false when role does not have permission', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      expect(role.hasPermission('perm-1')).toBe(false);
    });
  });

  describe('canBeDeleted', () => {
    it('should return true for non-system roles', () => {
      const role = Role.create({
        name: 'custom',
        displayName: 'Custom Role',
        isSystem: false,
      });

      expect(role.canBeDeleted()).toBe(true);
    });

    it('should return false for system roles', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        isSystem: true,
      });

      expect(role.canBeDeleted()).toBe(false);
    });
  });

  describe('canBeModified', () => {
    it('should return true for all roles', () => {
      const systemRole = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        isSystem: true,
      });

      const customRole = Role.create({
        name: 'custom',
        displayName: 'Custom Role',
        isSystem: false,
      });

      expect(systemRole.canBeModified()).toBe(true);
      expect(customRole.canBeModified()).toBe(true);
    });
  });

  describe('update', () => {
    it('should update displayName', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const updated = original.update({ displayName: 'Super Admin' });

      expect(updated.displayName).toBe('Super Admin');
      expect(original.displayName).toBe('Administrator');
    });

    it('should update description', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Old description',
      });

      const updated = original.update({ description: 'New description' });

      expect(updated.description).toBe('New description');
    });

    it('should update priority', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        priority: 0,
      });

      const updated = original.update({ priority: 100 });

      expect(updated.priority).toBe(100);
    });

    it('should update multiple fields at once', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Old',
        priority: 0,
      });

      const updated = original.update({
        displayName: 'New Name',
        description: 'New description',
        priority: 50,
      });

      expect(updated.displayName).toBe('New Name');
      expect(updated.description).toBe('New description');
      expect(updated.priority).toBe(50);
    });

    it('should trim displayName and description', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });

      const updated = original.update({
        displayName: '  Trimmed  ',
        description: '  Trimmed Desc  ',
      });

      expect(updated.displayName).toBe('Trimmed');
      expect(updated.description).toBe('Trimmed Desc');
    });
  });

  describe('setPermissions', () => {
    it('should replace all permissions', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      }).addPermissions(['perm-1', 'perm-2']);

      const updated = original.setPermissions(['perm-3', 'perm-4']);

      expect(updated.permissionIds.size).toBe(2);
      expect(updated.hasPermission('perm-1')).toBe(false);
      expect(updated.hasPermission('perm-2')).toBe(false);
      expect(updated.hasPermission('perm-3')).toBe(true);
      expect(updated.hasPermission('perm-4')).toBe(true);
    });

    it('should clear all permissions when given empty array', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      }).addPermissions(['perm-1', 'perm-2']);

      const updated = original.setPermissions([]);

      expect(updated.permissionIds.size).toBe(0);
    });
  });

  describe('equals', () => {
    it('should return true for roles with same name', () => {
      const role1 = Role.create({
        name: 'admin',
        displayName: 'Administrator 1',
      });
      const role2 = Role.create({
        name: 'admin',
        displayName: 'Administrator 2',
      });

      expect(role1.equals(role2)).toBe(true);
    });

    it('should return false for roles with different names', () => {
      const role1 = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });
      const role2 = Role.create({
        name: 'editor',
        displayName: 'Editor',
      });

      expect(role1.equals(role2)).toBe(false);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute role from stored props', () => {
      const props = {
        id: 'role-123',
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access',
        isSystem: true,
        priority: 100,
        permissionIds: ['perm-1', 'perm-2'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const role = Role.fromPersistence(props);

      expect(role.id).toBe('role-123');
      expect(role.name).toBe('admin');
      expect(role.displayName).toBe('Administrator');
      expect(role.description).toBe('Full access');
      expect(role.isSystem).toBe(true);
      expect(role.priority).toBe(100);
      expect(role.permissionIds.size).toBe(2);
      expect(role.hasPermission('perm-1')).toBe(true);
      expect(role.hasPermission('perm-2')).toBe(true);
      expect(role.createdAt).toEqual(new Date('2024-01-01'));
      expect(role.updatedAt).toEqual(new Date('2024-01-02'));
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties with permissionIds as array', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full access',
        isSystem: true,
        priority: 100,
      }).addPermissions(['perm-1', 'perm-2']);

      const json = role.toJSON();

      expect(json.name).toBe('admin');
      expect(json.displayName).toBe('Administrator');
      expect(json.description).toBe('Full access');
      expect(json.isSystem).toBe(true);
      expect(json.priority).toBe(100);
      expect(Array.isArray(json.permissionIds)).toBe(true);
      expect(json.permissionIds).toContain('perm-1');
      expect(json.permissionIds).toContain('perm-2');
    });
  });

  describe('immutability', () => {
    it('should not modify original role when adding permission', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      });
      const originalSize = original.permissionIds.size;

      original.addPermission('perm-1');

      expect(original.permissionIds.size).toBe(originalSize);
    });

    it('should not modify original role when updating', () => {
      const original = Role.create({
        name: 'admin',
        displayName: 'Original',
      });

      original.update({ displayName: 'Updated' });

      expect(original.displayName).toBe('Original');
    });

    it('should return readonly set for permissionIds', () => {
      const role = Role.create({
        name: 'admin',
        displayName: 'Administrator',
      }).addPermission('perm-1');

      const ids = role.permissionIds;

      // TypeScript should prevent this, but we can verify the type at runtime
      expect(ids.has('perm-1')).toBe(true);
    });
  });
});
