import { describe, expect, it } from 'bun:test';
import { Group } from './group.entity';

describe('Group Entity', () => {
  describe('create', () => {
    it('should create a group with valid name and displayName', () => {
      const group = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      expect(group.name).toBe('developers');
      expect(group.displayName).toBe('Developers');
      expect(group.isSystem).toBe(false);
      expect(group.roleIds.size).toBe(0);
      expect(group.permissionIds.size).toBe(0);
      expect(group.parentId).toBeUndefined();
    });

    it('should normalize name to lowercase with underscores', () => {
      const group = Group.create({
        name: 'Senior Developers',
        displayName: 'Senior Developers',
      });

      expect(group.name).toBe('senior_developers');
    });

    it('should trim whitespace from name and displayName', () => {
      const group = Group.create({
        name: '  developers  ',
        displayName: '  Developers  ',
      });

      expect(group.name).toBe('developers');
      expect(group.displayName).toBe('Developers');
    });

    it('should create a system group when specified', () => {
      const group = Group.create({
        name: 'admins',
        displayName: 'Administrators',
        isSystem: true,
      });

      expect(group.isSystem).toBe(true);
    });

    it('should include parentId when provided', () => {
      const group = Group.create({
        name: 'subgroup',
        displayName: 'Sub Group',
        parentId: 'parent-group-id',
      });

      expect(group.parentId).toBe('parent-group-id');
    });

    it('should include description when provided', () => {
      const group = Group.create({
        name: 'developers',
        displayName: 'Developers',
        description: 'Development team',
      });

      expect(group.description).toBe('Development team');
    });

    it('should set timestamps on creation', () => {
      const before = new Date();
      const group = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });
      const after = new Date();

      expect(group.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(group.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('validation', () => {
    it('should reject empty name', () => {
      expect(() =>
        Group.create({
          name: '',
          displayName: 'Developers',
        }),
      ).toThrow('Group name cannot be empty');
    });

    it('should reject empty displayName', () => {
      expect(() =>
        Group.create({
          name: 'developers',
          displayName: '',
        }),
      ).toThrow('Group displayName cannot be empty');
    });

    it('should reject name starting with number', () => {
      expect(() =>
        Group.create({
          name: '1developers',
          displayName: 'Developers',
        }),
      ).toThrow('must start with lowercase letter');
    });

    it('should reject name with invalid characters', () => {
      expect(() =>
        Group.create({
          name: 'dev-team',
          displayName: 'Dev Team',
        }),
      ).toThrow('must start with lowercase letter');
    });

    it('should reject name exceeding 50 characters', () => {
      const longName = 'a'.repeat(51);
      expect(() =>
        Group.create({
          name: longName,
          displayName: 'Developers',
        }),
      ).toThrow('Group name cannot exceed 50 characters');
    });

    it('should reject displayName exceeding 100 characters', () => {
      const longDisplayName = 'A'.repeat(101);
      expect(() =>
        Group.create({
          name: 'developers',
          displayName: longDisplayName,
        }),
      ).toThrow('Group displayName cannot exceed 100 characters');
    });

    it('should reject description exceeding 500 characters', () => {
      const longDescription = 'A'.repeat(501);
      expect(() =>
        Group.create({
          name: 'developers',
          displayName: 'Developers',
          description: longDescription,
        }),
      ).toThrow('Group description cannot exceed 500 characters');
    });

    it('should allow name with underscores', () => {
      const group = Group.create({
        name: 'senior_dev_team',
        displayName: 'Senior Dev Team',
      });

      expect(group.name).toBe('senior_dev_team');
    });
  });

  describe('isRoot', () => {
    it('should return true when group has no parent', () => {
      const group = Group.create({
        name: 'root',
        displayName: 'Root Group',
      });

      expect(group.isRoot).toBe(true);
    });

    it('should return false when group has parent', () => {
      const group = Group.create({
        name: 'child',
        displayName: 'Child Group',
        parentId: 'parent-id',
      });

      expect(group.isRoot).toBe(false);
    });
  });

  describe('addRole', () => {
    it('should add a role and return new group', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const updated = original.addRole('role-1');

      expect(updated.hasRole('role-1')).toBe(true);
      expect(original.hasRole('role-1')).toBe(false);
    });

    it('should return same instance if role already exists', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const withRole = original.addRole('role-1');
      const duplicate = withRole.addRole('role-1');

      expect(duplicate).toBe(withRole);
    });
  });

  describe('removeRole', () => {
    it('should remove a role and return new group', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      }).addRole('role-1');

      const updated = original.removeRole('role-1');

      expect(updated.hasRole('role-1')).toBe(false);
      expect(original.hasRole('role-1')).toBe(true);
    });

    it('should return same instance if role does not exist', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const result = original.removeRole('non-existent');

      expect(result).toBe(original);
    });
  });

  describe('hasRole', () => {
    it('should return true when group has role', () => {
      const group = Group.create({
        name: 'developers',
        displayName: 'Developers',
      }).addRole('role-1');

      expect(group.hasRole('role-1')).toBe(true);
    });

    it('should return false when group does not have role', () => {
      const group = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      expect(group.hasRole('role-1')).toBe(false);
    });
  });

  describe('addPermission', () => {
    it('should add a permission and return new group', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const updated = original.addPermission('perm-1');

      expect(updated.hasPermission('perm-1')).toBe(true);
      expect(original.hasPermission('perm-1')).toBe(false);
    });

    it('should return same instance if permission already exists', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const withPerm = original.addPermission('perm-1');
      const duplicate = withPerm.addPermission('perm-1');

      expect(duplicate).toBe(withPerm);
    });
  });

  describe('removePermission', () => {
    it('should remove a permission and return new group', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      }).addPermission('perm-1');

      const updated = original.removePermission('perm-1');

      expect(updated.hasPermission('perm-1')).toBe(false);
      expect(original.hasPermission('perm-1')).toBe(true);
    });

    it('should return same instance if permission does not exist', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const result = original.removePermission('non-existent');

      expect(result).toBe(original);
    });
  });

  describe('hasPermission', () => {
    it('should return true when group has permission', () => {
      const group = Group.create({
        name: 'developers',
        displayName: 'Developers',
      }).addPermission('perm-1');

      expect(group.hasPermission('perm-1')).toBe(true);
    });

    it('should return false when group does not have permission', () => {
      const group = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      expect(group.hasPermission('perm-1')).toBe(false);
    });
  });

  describe('setParent', () => {
    it('should set parent and return new group', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const updated = original.setParent('parent-id');

      expect(updated.parentId).toBe('parent-id');
      expect(original.parentId).toBeUndefined();
    });

    it('should remove parent when set to null', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
        parentId: 'old-parent',
      });

      const updated = original.setParent(null);

      expect(updated.parentId).toBeUndefined();
    });

    it('should return same instance if parent unchanged', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
        parentId: 'parent-id',
      });

      const result = original.setParent('parent-id');

      expect(result).toBe(original);
    });
  });

  describe('wouldCreateCycle', () => {
    it('should return true if potential parent is the group itself', () => {
      const group = Group.fromPersistence({
        id: 'group-1',
        name: 'developers',
        displayName: 'Developers',
        isSystem: false,
        roleIds: [],
        permissionIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(group.wouldCreateCycle('group-1', [])).toBe(true);
    });

    it('should return true if group is in ancestor chain', () => {
      const group = Group.fromPersistence({
        id: 'group-1',
        name: 'developers',
        displayName: 'Developers',
        isSystem: false,
        roleIds: [],
        permissionIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // group-1 is trying to become child of group-3
      // but group-1 is already an ancestor of group-3
      expect(group.wouldCreateCycle('group-3', ['group-1', 'group-2'])).toBe(true);
    });

    it('should return false if no cycle would be created', () => {
      const group = Group.fromPersistence({
        id: 'group-1',
        name: 'developers',
        displayName: 'Developers',
        isSystem: false,
        roleIds: [],
        permissionIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(group.wouldCreateCycle('group-3', ['group-4', 'group-5'])).toBe(false);
    });
  });

  describe('canBeDeleted', () => {
    it('should return true for non-system groups', () => {
      const group = Group.create({
        name: 'custom',
        displayName: 'Custom Group',
        isSystem: false,
      });

      expect(group.canBeDeleted()).toBe(true);
    });

    it('should return false for system groups', () => {
      const group = Group.create({
        name: 'admins',
        displayName: 'Administrators',
        isSystem: true,
      });

      expect(group.canBeDeleted()).toBe(false);
    });
  });

  describe('update', () => {
    it('should update displayName', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const updated = original.update({ displayName: 'Dev Team' });

      expect(updated.displayName).toBe('Dev Team');
      expect(original.displayName).toBe('Developers');
    });

    it('should update description', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
        description: 'Old description',
      });

      const updated = original.update({ description: 'New description' });

      expect(updated.description).toBe('New description');
    });

    it('should update parentId', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const updated = original.update({ parentId: 'new-parent' });

      expect(updated.parentId).toBe('new-parent');
    });

    it('should remove parentId when set to null', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
        parentId: 'old-parent',
      });

      const updated = original.update({ parentId: null });

      expect(updated.parentId).toBeUndefined();
    });

    it('should trim displayName and description', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });

      const updated = original.update({
        displayName: '  Trimmed  ',
        description: '  Trimmed Desc  ',
      });

      expect(updated.displayName).toBe('Trimmed');
      expect(updated.description).toBe('Trimmed Desc');
    });
  });

  describe('equals', () => {
    it('should return true for groups with same name', () => {
      const group1 = Group.create({
        name: 'developers',
        displayName: 'Developers 1',
      });
      const group2 = Group.create({
        name: 'developers',
        displayName: 'Developers 2',
      });

      expect(group1.equals(group2)).toBe(true);
    });

    it('should return false for groups with different names', () => {
      const group1 = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });
      const group2 = Group.create({
        name: 'designers',
        displayName: 'Designers',
      });

      expect(group1.equals(group2)).toBe(false);
    });
  });

  describe('fromPersistence', () => {
    it('should reconstitute group from stored props', () => {
      const props = {
        id: 'group-123',
        name: 'developers',
        displayName: 'Developers',
        description: 'Dev team',
        isSystem: true,
        parentId: 'parent-id',
        roleIds: ['role-1', 'role-2'],
        permissionIds: ['perm-1', 'perm-2'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const group = Group.fromPersistence(props);

      expect(group.id).toBe('group-123');
      expect(group.name).toBe('developers');
      expect(group.displayName).toBe('Developers');
      expect(group.description).toBe('Dev team');
      expect(group.isSystem).toBe(true);
      expect(group.parentId).toBe('parent-id');
      expect(group.roleIds.size).toBe(2);
      expect(group.hasRole('role-1')).toBe(true);
      expect(group.permissionIds.size).toBe(2);
      expect(group.hasPermission('perm-1')).toBe(true);
      expect(group.createdAt).toEqual(new Date('2024-01-01'));
      expect(group.updatedAt).toEqual(new Date('2024-01-02'));
    });
  });

  describe('toJSON', () => {
    it('should serialize all properties with roleIds and permissionIds as arrays', () => {
      const group = Group.create({
        name: 'developers',
        displayName: 'Developers',
        description: 'Dev team',
        isSystem: true,
        parentId: 'parent-id',
      })
        .addRole('role-1')
        .addPermission('perm-1');

      const json = group.toJSON();

      expect(json.name).toBe('developers');
      expect(json.displayName).toBe('Developers');
      expect(json.description).toBe('Dev team');
      expect(json.isSystem).toBe(true);
      expect(json.parentId).toBe('parent-id');
      expect(Array.isArray(json.roleIds)).toBe(true);
      expect(json.roleIds).toContain('role-1');
      expect(Array.isArray(json.permissionIds)).toBe(true);
      expect(json.permissionIds).toContain('perm-1');
    });
  });

  describe('immutability', () => {
    it('should not modify original group when adding role', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });
      const originalSize = original.roleIds.size;

      original.addRole('role-1');

      expect(original.roleIds.size).toBe(originalSize);
    });

    it('should not modify original group when adding permission', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Developers',
      });
      const originalSize = original.permissionIds.size;

      original.addPermission('perm-1');

      expect(original.permissionIds.size).toBe(originalSize);
    });

    it('should not modify original group when updating', () => {
      const original = Group.create({
        name: 'developers',
        displayName: 'Original',
      });

      original.update({ displayName: 'Updated' });

      expect(original.displayName).toBe('Original');
    });
  });
});
