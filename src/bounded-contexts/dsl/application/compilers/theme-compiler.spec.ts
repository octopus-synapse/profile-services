/**
 * Theme Compiler Tests (TDD)
 *
 * Tests for compiling theme definitions into resolved theme ASTs.
 */

import { describe, expect, it } from 'bun:test';
import type { RenderContext } from '../../domain/schemas/dsl/context.schema';
import type { ThemeDefinition } from '../../domain/schemas/dsl/theme-ast.schema';
import { ThemeCompiler } from './theme-compiler';

describe('ThemeCompiler', () => {
  describe('compile', () => {
    it('should compile a minimal theme', () => {
      const theme = createMinimalTheme();
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.meta.name).toBe('Test Theme');
      expect(result.meta.version).toBe('1.0.0');
      expect(result.meta.compiledAt).toBeDefined();
      expect(result.meta.sourceHash).toBeDefined();
    });

    it('should resolve typography tokens', () => {
      const theme = createMinimalTheme();
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.typography.fontFamily.heading).toBe('Inter, sans-serif');
      expect(result.tokens.typography.fontFamily.body).toBe('Inter, sans-serif');
    });

    it('should resolve font size scale', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          typography: {
            fontFamily: { heading: 'inter', body: 'inter' },
            fontSize: { base: 'base', scale: 1.25 },
            headingStyle: 'bold',
          },
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.typography.fontSize.base).toBe(16); // 'base' = 16px
      expect(result.tokens.typography.fontSize.scale).toBe(1.25);
      expect(result.tokens.typography.fontSize.heading).toBeGreaterThan(16);
    });

    it('should resolve shorthand font size', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          typography: {
            fontFamily: { heading: 'inter', body: 'inter' },
            fontSize: 'lg',
            headingStyle: 'bold',
          },
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.typography.fontSize.base).toBe(18); // 'lg' = 18px
    });

    it('should resolve color tokens', () => {
      const theme = createMinimalTheme();
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.colors.primary).toBe('#2563eb');
      expect(result.tokens.colors.background).toBe('#ffffff');
      expect(result.tokens.colors.text.primary).toBe('#1e293b');
    });

    it('should resolve spacing tokens', () => {
      const theme = createMinimalTheme();
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.spacing.unit).toBe(4);
      expect(result.tokens.spacing.density).toBe(1); // 'comfortable' = 1
      expect(result.tokens.spacing.sectionGap).toBeGreaterThan(0);
    });

    it('should resolve density multiplier', () => {
      const compactTheme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          spacing: { unit: 4, density: 'compact' },
        },
      };
      const spaciousTheme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          spacing: { unit: 4, density: 'spacious' },
        },
      };
      const compiler = new ThemeCompiler();

      const compactResult = compiler.compile(compactTheme);
      const spaciousResult = compiler.compile(spaciousTheme);

      expect(compactResult.tokens.spacing.density).toBeLessThan(1);
      expect(spaciousResult.tokens.spacing.density).toBeGreaterThan(1);
    });

    it('should resolve effects tokens', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          effects: {
            borderRadius: 'md',
            shadows: 'subtle',
          },
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.effects.borderRadius).toBe(8); // 'md' = 8px
      expect(result.tokens.effects.shadows).toMatch(/box-shadow/i);
    });

    it('should apply default effects when not provided', () => {
      const theme = createMinimalTheme();
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.effects.borderRadius).toBeDefined();
      expect(result.tokens.effects.shadows).toBeDefined();
    });
  });

  describe('expression resolution', () => {
    it('should resolve derived token expressions', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        derived: {
          primaryLight: '${lighten(colors.primary, 15)}',
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.derived?.primaryLight).toMatch(/^#[0-9a-fA-F]{6}$/);
      // Should be lighter than primary
      expect(result.tokens.derived?.primaryLight).not.toBe('#2563eb');
    });

    it('should resolve mathematical expressions', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        derived: {
          sectionGap: '${spacing.unit * 6}px',
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.derived?.sectionGap).toBe('24px');
    });

    it('should resolve nested references', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        derived: {
          textAccent: '${colors.text.accent}',
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.derived?.textAccent).toBe('#2563eb');
    });

    it('should resolve function expressions with references', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        derived: {
          primaryAlpha: '${alpha(colors.primary, 0.5)}',
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.derived?.primaryAlpha).toMatch(/^rgba\(/);
    });

    it('should resolve contrast function', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        derived: {
          onPrimary: '${contrast(colors.primary)}',
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      // Primary is blue, so contrast should be white
      expect(result.tokens.derived?.onPrimary).toBe('#ffffff');
    });
  });

  describe('heading style resolution', () => {
    it('should resolve bold heading style', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          typography: {
            ...createMinimalTheme().tokens.typography,
            headingStyle: 'bold',
          },
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.typography.headingStyle.fontWeight).toBe(700);
    });

    it('should resolve underline heading style', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          typography: {
            ...createMinimalTheme().tokens.typography,
            headingStyle: 'underline',
          },
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.typography.headingStyle.borderBottom).toBeDefined();
    });

    it('should resolve uppercase heading style', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          typography: {
            ...createMinimalTheme().tokens.typography,
            headingStyle: 'uppercase',
          },
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.typography.headingStyle.textTransform).toBe('uppercase');
    });

    it('should resolve accent-border heading style', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          typography: {
            ...createMinimalTheme().tokens.typography,
            headingStyle: 'accent-border',
          },
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.tokens.typography.headingStyle.borderLeft).toBeDefined();
      expect(result.tokens.typography.headingStyle.paddingLeft).toBeGreaterThan(0);
    });
  });

  describe('layout resolution', () => {
    it('should pass through layout config', () => {
      const theme = createMinimalTheme();
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(result.layout.type).toBe('single-column');
      expect(result.layout.paperSize).toBe('a4');
      expect(result.layout.margins).toBe('normal');
    });
  });

  describe('variant application', () => {
    it('should apply print variant when media is print', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          effects: { borderRadius: 'md', shadows: 'subtle' },
        },
        variants: [
          {
            when: "context.media == 'print'",
            apply: { effects: { shadows: 'none' } },
          },
        ],
      };
      const context: RenderContext = { media: 'print', colorScheme: 'light' };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme, context);

      expect(result.tokens.effects.shadows).toBe('none');
    });

    it('should not apply print variant when media is screen', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        tokens: {
          ...createMinimalTheme().tokens,
          effects: { borderRadius: 'md', shadows: 'subtle' },
        },
        variants: [
          {
            when: "context.media == 'print'",
            apply: { effects: { shadows: 'none' } },
          },
        ],
      };
      const context: RenderContext = { media: 'screen', colorScheme: 'light' };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme, context);

      expect(result.tokens.effects.shadows).not.toBe('none');
    });

    it('should apply dark mode variant', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        variants: [
          {
            when: "context.colorScheme == 'dark'",
            apply: {
              colors: {
                background: '#0f172a',
                text: { primary: '#f1f5f9' },
              },
            },
          },
        ],
      };
      const context: RenderContext = { media: 'screen', colorScheme: 'dark' };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme, context);

      expect(result.tokens.colors.background).toBe('#0f172a');
      expect(result.tokens.colors.text.primary).toBe('#f1f5f9');
    });

    it('should apply multiple matching variants in order', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        variants: [
          {
            when: "context.colorScheme == 'dark'",
            apply: { colors: { background: '#1a1a1a' } },
          },
          {
            when: "context.media == 'print'",
            apply: { colors: { background: '#ffffff' } },
          },
        ],
      };
      const context: RenderContext = { media: 'print', colorScheme: 'dark' };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme, context);

      // Print variant applied last should override dark mode
      expect(result.tokens.colors.background).toBe('#ffffff');
    });
  });

  describe('section styles resolution', () => {
    it('should resolve section style expressions', () => {
      const theme: ThemeDefinition = {
        ...createMinimalTheme(),
        sections: {
          experience: {
            container: { marginBottom: '${spacing.unit * 4}px' },
            title: { color: '${colors.primary}' },
          },
        },
      };
      const compiler = new ThemeCompiler();

      const result = compiler.compile(theme);

      expect(
        (result.sectionStyles?.experience?.container as Record<string, unknown>)?.marginBottom,
      ).toBe('16px');
      expect((result.sectionStyles?.experience?.title as Record<string, unknown>)?.color).toBe(
        '#2563eb',
      );
    });
  });

  describe('source hash', () => {
    it('should generate consistent hash for same input', () => {
      const theme = createMinimalTheme();
      const compiler = new ThemeCompiler();

      const result1 = compiler.compile(theme);
      const result2 = compiler.compile(theme);

      expect(result1.meta.sourceHash).toBe(result2.meta.sourceHash);
    });

    it('should generate different hash for different input', () => {
      const theme1 = createMinimalTheme();
      const theme2 = {
        ...createMinimalTheme(),
        meta: { ...createMinimalTheme().meta, name: 'Different Theme' },
      };
      const compiler = new ThemeCompiler();

      const result1 = compiler.compile(theme1);
      const result2 = compiler.compile(theme2);

      expect(result1.meta.sourceHash).not.toBe(result2.meta.sourceHash);
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createMinimalTheme(): ThemeDefinition {
  return {
    meta: {
      version: '1.0.0',
      name: 'Test Theme',
    },
    tokens: {
      typography: {
        fontFamily: { heading: 'inter', body: 'inter' },
        fontSize: 'base',
        headingStyle: 'bold',
      },
      colors: {
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
      },
      spacing: {
        unit: 4,
        density: 'comfortable',
      },
    },
    layout: {
      type: 'single-column',
      paperSize: 'a4',
      margins: 'normal',
    },
  };
}
