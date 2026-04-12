/**
 * Theme DSL Service Tests (TDD)
 *
 * Tests for the orchestration service that handles theme parsing and compilation.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { RenderContext } from './domain/schemas/dsl/context.schema';
import { ThemeCompilationError, ThemeDslService } from './theme-dsl.service';

describe('ThemeDslService', () => {
  let service: ThemeDslService;

  beforeEach(() => {
    service = new ThemeDslService();
  });

  describe('compileFromDefinition', () => {
    it('should compile a valid theme definition', () => {
      const definition = createValidThemeDefinition();

      const result = service.compileFromDefinition(definition);

      expect(result.meta.name).toBe('Modern Professional');
      expect(result.tokens.typography.fontFamily.heading).toBe('Inter, sans-serif');
      expect(result.tokens.colors.primary).toBe('#2563eb');
    });

    it('should throw ThemeCompilationError for invalid definition', () => {
      const invalidDefinition = {
        meta: { name: 'Test' }, // Missing version
        tokens: {},
        layout: {},
      };

      expect(() => service.compileFromDefinition(invalidDefinition)).toThrow(ThemeCompilationError);
    });

    it('should include detailed error info in ThemeCompilationError', () => {
      const invalidDefinition = {
        meta: { version: '1.0.0', name: 'Test' },
        tokens: {
          typography: {
            fontFamily: { heading: 'invalid-font', body: 'inter' },
          },
        },
        layout: {},
      };

      try {
        service.compileFromDefinition(invalidDefinition);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ThemeCompilationError);
        const compError = error as ThemeCompilationError;
        expect(compError.issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('compileWithContext', () => {
    it('should compile with screen context', () => {
      const definition = createValidThemeDefinition();
      const context: RenderContext = { media: 'screen', colorScheme: 'light' };

      const result = service.compileWithContext(definition, context);

      expect(result.tokens.effects.shadows).toContain('box-shadow');
    });

    it('should compile with print context and apply variants', () => {
      const definition = {
        ...createValidThemeDefinition(),
        variants: [
          {
            when: "context.media == 'print'",
            apply: { effects: { shadows: 'none' } },
          },
        ],
      };
      const context: RenderContext = { media: 'print', colorScheme: 'light' };

      const result = service.compileWithContext(definition, context);

      expect(result.tokens.effects.shadows).toBe('none');
    });

    it('should compile with dark mode context', () => {
      const definition = {
        ...createValidThemeDefinition(),
        variants: [
          {
            when: "context.colorScheme == 'dark'",
            apply: {
              colors: {
                background: '#0f172a',
                surface: '#1e293b',
                text: { primary: '#f1f5f9', secondary: '#cbd5e1', accent: '#60a5fa' },
              },
            },
          },
        ],
      };
      const context: RenderContext = { media: 'screen', colorScheme: 'dark' };

      const result = service.compileWithContext(definition, context);

      expect(result.tokens.colors.background).toBe('#0f172a');
      expect(result.tokens.colors.text.primary).toBe('#f1f5f9');
    });
  });

  describe('validateDefinition', () => {
    it('should return success for valid definition', () => {
      const definition = createValidThemeDefinition();

      const result = service.validateDefinition(definition);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid definition', () => {
      const invalidDefinition = {
        meta: { name: 'Test' }, // Missing version
        tokens: {},
        layout: {},
      };

      const result = service.validateDefinition(invalidDefinition);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should provide path information in errors', () => {
      const invalidDefinition = {
        meta: { version: '1.0.0', name: 'Test' },
        tokens: {
          typography: {
            fontFamily: { heading: 'invalid-font', body: 'inter' },
            fontSize: 'base',
            headingStyle: 'bold',
          },
          colors: createMinimalColors(),
          spacing: { unit: 4, density: 'comfortable' },
        },
        layout: { type: 'single-column', paperSize: 'a4', margins: 'normal' },
      };

      const result = service.validateDefinition(invalidDefinition);

      expect(result.valid).toBe(false);
      expect(result.errors?.some((e) => e.path.includes('fontFamily'))).toBe(true);
    });
  });

  describe('resolveExpression', () => {
    it('should resolve simple reference', () => {
      const context = {
        colors: { primary: '#2563eb' },
      };

      const result = service.resolveExpression('${colors.primary}', context);

      expect(result).toBe('#2563eb');
    });

    it('should resolve mathematical expression', () => {
      const context = {
        spacing: { unit: 4 },
      };

      const result = service.resolveExpression('${spacing.unit * 6}px', context);

      expect(result).toBe('24px');
    });

    it('should resolve function call', () => {
      const context = {
        colors: { primary: '#000000' },
      };

      const result = service.resolveExpression('${lighten(colors.primary, 50)}', context);

      expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('should return plain string as-is', () => {
      const context = {};

      const result = service.resolveExpression('#ffffff', context);

      expect(result).toBe('#ffffff');
    });
  });

  describe('mergeThemes', () => {
    it('should merge base and custom themes', () => {
      const baseTheme = createValidThemeDefinition();
      const customOverrides = {
        colors: {
          primary: '#dc2626', // Red instead of blue
        },
      };

      const result = service.mergeThemes(baseTheme, customOverrides);

      expect(result.tokens.colors.primary).toBe('#dc2626');
      expect(result.tokens.colors.secondary).toBe('#64748b'); // Unchanged
    });

    it('should merge nested objects deeply', () => {
      const baseTheme = createValidThemeDefinition();
      const customOverrides = {
        colors: {
          text: {
            primary: '#000000', // Only change text.primary
          },
        },
      };

      const result = service.mergeThemes(baseTheme, customOverrides);

      expect(result.tokens.colors.text.primary).toBe('#000000');
      expect(result.tokens.colors.text.secondary).toBe('#64748b'); // Unchanged
    });

    it('should preserve non-overridden sections', () => {
      const baseTheme = createValidThemeDefinition();
      const customOverrides = {
        typography: {
          fontFamily: { heading: 'poppins', body: 'poppins' },
        },
      };

      const result = service.mergeThemes(baseTheme, customOverrides);

      expect(result.tokens.typography.fontFamily.heading).toBe('poppins');
      expect(result.tokens.colors.primary).toBe('#2563eb'); // Unchanged
      expect(result.layout.type).toBe('single-column'); // Unchanged
    });
  });

  describe('generateStyleVariables', () => {
    it('should generate CSS variables from compiled theme', () => {
      const definition = createValidThemeDefinition();
      const compiled = service.compileFromDefinition(definition);

      const variables = service.generateStyleVariables(compiled);

      expect(variables['--color-primary']).toBe('#2563eb');
      expect(variables['--color-background']).toBe('#ffffff');
      expect(variables['--font-family-heading']).toBe('Inter, sans-serif');
      expect(variables['--spacing-unit']).toBe('4px');
    });

    it('should include typography variables', () => {
      const definition = createValidThemeDefinition();
      const compiled = service.compileFromDefinition(definition);

      const variables = service.generateStyleVariables(compiled);

      expect(variables['--font-size-base']).toBeDefined();
      expect(variables['--line-height-base']).toBeDefined();
    });

    it('should include spacing variables', () => {
      const definition = createValidThemeDefinition();
      const compiled = service.compileFromDefinition(definition);

      const variables = service.generateStyleVariables(compiled);

      expect(variables['--spacing-section-gap']).toBeDefined();
      expect(variables['--spacing-item-gap']).toBeDefined();
    });
  });

  describe('caching', () => {
    it('should return same result for same input (cached)', () => {
      const definition = createValidThemeDefinition();

      const result1 = service.compileFromDefinition(definition);
      const result2 = service.compileFromDefinition(definition);

      // Same source hash means same compiled output
      expect(result1.meta.sourceHash).toBe(result2.meta.sourceHash);
    });

    it('should invalidate cache when definition changes', () => {
      const definition1 = createValidThemeDefinition();
      const definition2 = {
        ...createValidThemeDefinition(),
        meta: { ...createValidThemeDefinition().meta, name: 'Different Theme' },
      };

      const result1 = service.compileFromDefinition(definition1);
      const result2 = service.compileFromDefinition(definition2);

      expect(result1.meta.sourceHash).not.toBe(result2.meta.sourceHash);
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createMinimalColors() {
  return {
    primary: '#2563eb',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      accent: '#2563eb',
    },
    border: '#e2e8f0',
    divider: '#f1f5f9',
  };
}

function createValidThemeDefinition() {
  return {
    meta: {
      version: '1.0.0',
      name: 'Modern Professional',
      description: 'A clean, modern resume theme',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'inter' as const, body: 'inter' as const },
        fontSize: { base: 'base' as const, scale: 1.25 },
        headingStyle: 'accent-border' as const,
      },
      colors: createMinimalColors(),
      spacing: {
        unit: 4,
        density: 'comfortable' as const,
        sectionGap: 'lg' as const,
        itemGap: 'md' as const,
      },
      effects: {
        borderRadius: 'sm' as const,
        shadows: 'subtle' as const,
      },
    },
    layout: {
      type: 'single-column' as const,
      paperSize: 'a4' as const,
      margins: 'normal' as const,
    },
  };
}
