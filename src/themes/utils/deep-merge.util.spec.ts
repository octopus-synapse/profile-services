/**
 * Deep Merge Utility Tests
 * Tests for merging nested config objects
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { deepMerge } from './deep-merge.util';

describe('deepMerge', () => {
  describe('basic merging', () => {
    it('should merge flat objects', () => {
      const base = { a: 1, b: 2 };
      const overrides = { b: 3, c: 4 };

      const result = deepMerge(base, overrides);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should not mutate original objects', () => {
      const base = { a: 1, b: 2 };
      const overrides = { b: 3 };

      deepMerge(base, overrides);

      expect(base).toEqual({ a: 1, b: 2 });
      expect(overrides).toEqual({ b: 3 });
    });

    it('should return base when overrides is empty', () => {
      const base = { a: 1, b: 2 };
      const overrides = {};

      const result = deepMerge(base, overrides);

      expect(result).toEqual({ a: 1, b: 2 });
    });
  });

  describe('nested objects', () => {
    it('should merge nested objects recursively', () => {
      const base = {
        layout: { columns: 2, gap: 16 },
        colors: { primary: '#000', secondary: '#fff' },
      };
      const overrides = {
        layout: { gap: 24 },
        colors: { primary: '#333' },
      };

      const result = deepMerge(base, overrides);

      expect(result).toEqual({
        layout: { columns: 2, gap: 24 },
        colors: { primary: '#333', secondary: '#fff' },
      });
    });

    it('should handle deeply nested objects', () => {
      const base = {
        theme: {
          colors: {
            primary: { light: '#eee', dark: '#111' },
            secondary: { light: '#ddd', dark: '#222' },
          },
        },
      };
      const overrides = {
        theme: {
          colors: {
            primary: { dark: '#000' },
          },
        },
      };

      const result = deepMerge(base, overrides);

      expect(result.theme.colors.primary.light).toBe('#eee');
      expect(result.theme.colors.primary.dark).toBe('#000');
      expect(result.theme.colors.secondary).toEqual({
        light: '#ddd',
        dark: '#222',
      });
    });
  });

  describe('null values', () => {
    it('should handle null values correctly - override replaces', () => {
      const base = { a: { nested: 'value' }, b: 2 };
      const overrides = { a: null };

      const result = deepMerge(base, overrides as any);

      expect(result.a).toBeNull();
      expect(result.b).toBe(2);
    });

    it('should handle null in base object', () => {
      const base = { a: null, b: 2 };
      const overrides = { a: { nested: 'value' } };

      const result = deepMerge(base, overrides as any);

      expect(result.a).toEqual({ nested: 'value' });
    });
  });

  describe('array handling', () => {
    it('should replace arrays instead of merging', () => {
      const base = { tags: ['a', 'b', 'c'], value: 1 };
      const overrides = { tags: ['x', 'y'] };

      const result = deepMerge(base, overrides);

      expect(result.tags).toEqual(['x', 'y']);
    });

    it('should not deep merge array contents', () => {
      const base = { items: [{ id: 1, name: 'a' }] };
      const overrides = { items: [{ id: 2, name: 'b' }] };

      const result = deepMerge(base, overrides);

      expect(result.items).toEqual([{ id: 2, name: 'b' }]);
    });
  });

  describe('undefined handling', () => {
    it('should skip undefined values in overrides', () => {
      const base = { a: 1, b: 2 };
      const overrides = { a: undefined, b: 3 };

      const result = deepMerge(base, overrides);

      expect(result).toEqual({ a: 1, b: 3 });
    });
  });

  describe('type coercion edge cases', () => {
    it('should handle primitive override over object', () => {
      const base = { value: { nested: true } };
      const overrides = { value: 42 };

      const result = deepMerge(base, overrides as any);

      expect(result.value).toBe(42);
    });

    it('should handle object override over primitive', () => {
      const base = { value: 42 };
      const overrides = { value: { nested: true } };

      const result = deepMerge(base, overrides as any);

      expect(result.value).toEqual({ nested: true });
    });

    it('should handle boolean values', () => {
      const base = { visible: true, enabled: false };
      const overrides = { visible: false };

      const result = deepMerge(base, overrides);

      expect(result.visible).toBe(false);
      expect(result.enabled).toBe(false);
    });

    it('should handle string values', () => {
      const base = { name: 'original', type: 'base' };
      const overrides = { name: 'override' };

      const result = deepMerge(base, overrides);

      expect(result.name).toBe('override');
      expect(result.type).toBe('base');
    });
  });

  describe('real-world theme config scenarios', () => {
    it('should merge theme styleConfig correctly', () => {
      const baseTheme = {
        layout: {
          type: 'single-column',
          spacing: 16,
          margins: { top: 20, bottom: 20 },
        },
        typography: {
          fontFamily: 'Inter',
          sizes: { h1: 24, h2: 20, body: 14 },
        },
        colors: {
          primary: '#3b82f6',
          background: '#ffffff',
        },
      };

      const customizations = {
        layout: {
          spacing: 24,
        },
        colors: {
          primary: '#10b981',
        },
      };

      const result = deepMerge(baseTheme, customizations);

      expect(result).toEqual({
        layout: {
          type: 'single-column',
          spacing: 24,
          margins: { top: 20, bottom: 20 },
        },
        typography: {
          fontFamily: 'Inter',
          sizes: { h1: 24, h2: 20, body: 14 },
        },
        colors: {
          primary: '#10b981',
          background: '#ffffff',
        },
      });
    });
  });
});
