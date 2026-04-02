import { describe, expect, it } from 'bun:test';
import {
  assertGroupValid,
  validateDescription,
  validateDisplayName,
  validateGroup,
  validateGroupName,
  validateParentId,
} from './group-validation';

describe('Group Validation', () => {
  describe('validateGroupName', () => {
    it('should return null for valid name', () => {
      expect(validateGroupName('developers')).toBeNull();
    });

    it('should return null for name with underscores', () => {
      expect(validateGroupName('senior_developers')).toBeNull();
    });

    it('should return null for name with numbers', () => {
      expect(validateGroupName('dev2team')).toBeNull();
    });

    it('should return error for empty name', () => {
      expect(validateGroupName('')).toBe('Group name cannot be empty');
    });

    it('should return error for name starting with number', () => {
      const error = validateGroupName('1developers');
      expect(error).toContain('must start with lowercase letter');
    });

    it('should return error for name with uppercase', () => {
      const error = validateGroupName('Developers');
      expect(error).toContain('must start with lowercase letter');
    });

    it('should return error for name with hyphens', () => {
      const error = validateGroupName('dev-team');
      expect(error).toContain('must start with lowercase letter');
    });

    it('should return error for name with spaces', () => {
      const error = validateGroupName('dev team');
      expect(error).toContain('must start with lowercase letter');
    });

    it('should return error for name exceeding 50 characters', () => {
      const longName = 'a'.repeat(51);
      expect(validateGroupName(longName)).toBe('Group name cannot exceed 50 characters');
    });

    it('should allow name with exactly 50 characters', () => {
      const maxName = 'a'.repeat(50);
      expect(validateGroupName(maxName)).toBeNull();
    });
  });

  describe('validateDisplayName', () => {
    it('should return null for valid displayName', () => {
      expect(validateDisplayName('Developers')).toBeNull();
    });

    it('should return null for displayName with spaces and special chars', () => {
      expect(validateDisplayName('Senior Developers (US)')).toBeNull();
    });

    it('should return error for empty displayName', () => {
      expect(validateDisplayName('')).toBe('Group displayName cannot be empty');
    });

    it('should return error for displayName exceeding 100 characters', () => {
      const longDisplayName = 'A'.repeat(101);
      expect(validateDisplayName(longDisplayName)).toBe(
        'Group displayName cannot exceed 100 characters',
      );
    });

    it('should allow displayName with exactly 100 characters', () => {
      const maxDisplayName = 'A'.repeat(100);
      expect(validateDisplayName(maxDisplayName)).toBeNull();
    });
  });

  describe('validateDescription', () => {
    it('should return null for valid description', () => {
      expect(validateDescription('This is a description')).toBeNull();
    });

    it('should return null for undefined description', () => {
      expect(validateDescription(undefined)).toBeNull();
    });

    it('should return null for empty description', () => {
      expect(validateDescription('')).toBeNull();
    });

    it('should return error for description exceeding 500 characters', () => {
      const longDescription = 'A'.repeat(501);
      expect(validateDescription(longDescription)).toBe(
        'Group description cannot exceed 500 characters',
      );
    });

    it('should allow description with exactly 500 characters', () => {
      const maxDescription = 'A'.repeat(500);
      expect(validateDescription(maxDescription)).toBeNull();
    });
  });

  describe('validateParentId', () => {
    it('should return null for valid parentId', () => {
      expect(validateParentId('parent-id', 'group-id')).toBeNull();
    });

    it('should return null for undefined parentId', () => {
      expect(validateParentId(undefined, 'group-id')).toBeNull();
    });

    it('should return error if parentId equals id', () => {
      expect(validateParentId('group-id', 'group-id')).toBe('Group cannot be its own parent');
    });

    it('should allow self-reference if id is empty (new group)', () => {
      // When id is empty string, it's a new group being created
      expect(validateParentId('', '')).toBeNull();
    });
  });

  describe('validateGroup', () => {
    it('should return valid result for valid group', () => {
      const result = validateGroup({
        id: 'group-id',
        name: 'developers',
        displayName: 'Developers',
        description: 'Dev team',
        parentId: 'parent-id',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid result without optional fields', () => {
      const result = validateGroup({
        id: 'group-id',
        name: 'developers',
        displayName: 'Developers',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return invalid result with name error', () => {
      const result = validateGroup({
        id: 'group-id',
        name: '',
        displayName: 'Developers',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group name cannot be empty');
    });

    it('should return invalid result with displayName error', () => {
      const result = validateGroup({
        id: 'group-id',
        name: 'developers',
        displayName: '',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group displayName cannot be empty');
    });

    it('should return invalid result with description error', () => {
      const result = validateGroup({
        id: 'group-id',
        name: 'developers',
        displayName: 'Developers',
        description: 'A'.repeat(501),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group description cannot exceed 500 characters');
    });

    it('should return invalid result with self-parent error', () => {
      const result = validateGroup({
        id: 'group-id',
        name: 'developers',
        displayName: 'Developers',
        parentId: 'group-id',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Group cannot be its own parent');
    });

    it('should collect multiple errors', () => {
      const result = validateGroup({
        id: 'group-id',
        name: '',
        displayName: '',
        description: 'A'.repeat(501),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('assertGroupValid', () => {
    it('should not throw for valid group', () => {
      expect(() =>
        assertGroupValid({
          id: 'group-id',
          name: 'developers',
          displayName: 'Developers',
        }),
      ).not.toThrow();
    });

    it('should throw first error for invalid group', () => {
      expect(() =>
        assertGroupValid({
          id: 'group-id',
          name: '',
          displayName: 'Developers',
        }),
      ).toThrow('Group name cannot be empty');
    });

    it('should throw first error when multiple errors exist', () => {
      // First error should be name since it's validated first
      expect(() =>
        assertGroupValid({
          id: 'group-id',
          name: '',
          displayName: '',
        }),
      ).toThrow('Group name cannot be empty');
    });
  });
});
