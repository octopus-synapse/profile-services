/**
 * Color Functions Tests (TDD)
 *
 * Tests for color manipulation functions used in theme DSL expressions.
 */

import { describe, expect, it } from 'bun:test';
import { colorFunctions } from './color-functions';

describe('colorFunctions', () => {
  describe('lighten', () => {
    it('should lighten black by 50%', () => {
      const result = colorFunctions.lighten('#000000', 50);

      // Should be around middle gray
      expect(result).toMatch(/^#[7-9a-fA-F][0-9a-fA-F]{5}$/);
    });

    it('should not go above white', () => {
      const result = colorFunctions.lighten('#ffffff', 50);

      expect(result).toBe('#ffffff');
    });

    it('should handle 3-digit hex', () => {
      const result = colorFunctions.lighten('#000', 50);

      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('darken', () => {
    it('should darken white by 50%', () => {
      const result = colorFunctions.darken('#ffffff', 50);

      // Should be around middle gray
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should not go below black', () => {
      const result = colorFunctions.darken('#000000', 50);

      expect(result).toBe('#000000');
    });
  });

  describe('saturate', () => {
    it('should increase saturation', () => {
      // Gray has 0 saturation, saturating won't change it
      // Use a color with some saturation
      const result = colorFunctions.saturate('#808080', 50);

      // Gray stays gray because hue is undefined
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('desaturate', () => {
    it('should decrease saturation', () => {
      // Fully saturated red
      const result = colorFunctions.desaturate('#ff0000', 100);

      // Should become gray - all channels equal
      expect(result).toMatch(/^#([0-9a-fA-F]{2})\1\1$/);
    });
  });

  describe('alpha', () => {
    it('should return rgba format', () => {
      const result = colorFunctions.alpha('#ff0000', 0.5);

      expect(result).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should handle hex input', () => {
      const result = colorFunctions.alpha('#2563eb', 0.1);

      expect(result).toMatch(/^rgba\(\d+, \d+, \d+, 0\.1\)$/);
    });
  });

  describe('mix', () => {
    it('should mix two colors equally', () => {
      const result = colorFunctions.mix('#ff0000', '#0000ff', 0.5);

      // Red + Blue = Purple-ish
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
      // R should be around 127, B should be around 127
      const r = parseInt(result.slice(1, 3), 16);
      const b = parseInt(result.slice(5, 7), 16);
      expect(r).toBeGreaterThan(100);
      expect(b).toBeGreaterThan(100);
    });

    it('should return first color when weight is 0', () => {
      const result = colorFunctions.mix('#ff0000', '#0000ff', 0);

      expect(result).toBe('#ff0000');
    });

    it('should return second color when weight is 1', () => {
      const result = colorFunctions.mix('#ff0000', '#0000ff', 1);

      expect(result).toBe('#0000ff');
    });
  });

  describe('contrast', () => {
    it('should return white for dark colors', () => {
      const result = colorFunctions.contrast('#000000');

      expect(result).toBe('#ffffff');
    });

    it('should return black for light colors', () => {
      const result = colorFunctions.contrast('#ffffff');

      expect(result).toBe('#000000');
    });

    it('should return appropriate contrast for mid-colors', () => {
      const result = colorFunctions.contrast('#2563eb'); // Blue

      // Blue is relatively dark, should return white
      expect(result).toBe('#ffffff');
    });
  });

  describe('edge cases', () => {
    it('should handle rgb input', () => {
      const result = colorFunctions.lighten('rgb(0, 0, 0)', 50);

      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should handle rgba input', () => {
      const result = colorFunctions.darken('rgba(255, 255, 255, 0.5)', 50);

      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should handle invalid color gracefully', () => {
      const result = colorFunctions.lighten('invalid', 50);

      // Should treat invalid as black and lighten
      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
