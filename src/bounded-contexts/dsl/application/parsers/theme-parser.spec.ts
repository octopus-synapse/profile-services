/**
 * Theme Parser Tests (TDD)
 *
 * Tests for parsing theme definitions (JSON/object) into validated theme syntax.
 */

import { describe, expect, it } from 'bun:test';
import { ThemeParseError, ThemeParser } from './theme-parser';

describe('ThemeParser', () => {
  describe('meta parsing', () => {
    it('should parse valid meta section', () => {
      const input = {
        meta: {
          version: '1.0.0',
          name: 'Modern Professional',
          description: 'A clean, modern theme',
        },
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.meta.version).toBe('1.0.0');
      expect(result.meta.name).toBe('Modern Professional');
      expect(result.meta.description).toBe('A clean, modern theme');
    });

    it('should throw for missing meta', () => {
      const input = {
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
      };

      expect(() => ThemeParser.parse(input)).toThrow(ThemeParseError);
    });

    it('should throw for missing version', () => {
      const input = {
        meta: { name: 'Test' },
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
      };

      expect(() => ThemeParser.parse(input)).toThrow(ThemeParseError);
    });
  });

  describe('typography tokens parsing', () => {
    it('should parse full typography config', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: {
            fontFamily: {
              heading: 'inter',
              body: 'roboto',
              mono: 'source-sans-pro',
            },
            fontSize: {
              base: 'base',
              scale: 1.25,
            },
            headingStyle: 'accent-border',
          },
          colors: createMinimalColors(),
          spacing: createMinimalSpacing(),
        },
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.tokens.typography.fontFamily.heading).toBe('inter');
      expect(result.tokens.typography.fontFamily.body).toBe('roboto');
      expect(result.tokens.typography.headingStyle).toBe('accent-border');
    });

    it('should parse shorthand fontSize', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: {
            fontFamily: { heading: 'inter', body: 'inter' },
            fontSize: 'lg',
            headingStyle: 'bold',
          },
          colors: createMinimalColors(),
          spacing: createMinimalSpacing(),
        },
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.tokens.typography.fontSize).toBe('lg');
    });

    it('should throw for invalid font family', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: {
            fontFamily: { heading: 'comic-sans', body: 'inter' },
            fontSize: 'base',
            headingStyle: 'bold',
          },
          colors: createMinimalColors(),
          spacing: createMinimalSpacing(),
        },
        layout: createMinimalLayout(),
      };

      expect(() => ThemeParser.parse(input)).toThrow(ThemeParseError);
    });
  });

  describe('color tokens parsing', () => {
    it('should parse hex colors', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: createMinimalTypography(),
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
          spacing: createMinimalSpacing(),
        },
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.tokens.colors.primary).toBe('#2563eb');
      expect(result.tokens.colors.text.primary).toBe('#1e293b');
    });

    it('should parse expression colors', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: createMinimalTypography(),
          colors: {
            primary: '#2563eb',
            secondary: '${lighten(primary, 20)}',
            background: '#ffffff',
            surface: '#f8fafc',
            text: {
              primary: '#1e293b',
              secondary: '#64748b',
              accent: '${colors.primary}',
            },
            border: '#e2e8f0',
            divider: '#f1f5f9',
          },
          spacing: createMinimalSpacing(),
        },
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.tokens.colors.secondary).toBe('${lighten(primary, 20)}');
      expect(result.tokens.colors.text.accent).toBe('${colors.primary}');
    });
  });

  describe('spacing tokens parsing', () => {
    it('should parse spacing config', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: createMinimalTypography(),
          colors: createMinimalColors(),
          spacing: {
            unit: 4,
            density: 'comfortable',
            sectionGap: 'lg',
            itemGap: 'md',
          },
        },
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.tokens.spacing.unit).toBe(4);
      expect(result.tokens.spacing.density).toBe('comfortable');
      expect(result.tokens.spacing.sectionGap).toBe('lg');
    });

    it('should throw for invalid density', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: createMinimalTypography(),
          colors: createMinimalColors(),
          spacing: {
            unit: 4,
            density: 'ultra-compact', // Invalid
          },
        },
        layout: createMinimalLayout(),
      };

      expect(() => ThemeParser.parse(input)).toThrow(ThemeParseError);
    });
  });

  describe('effects tokens parsing', () => {
    it('should parse effects config', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: createMinimalTypography(),
          colors: createMinimalColors(),
          spacing: createMinimalSpacing(),
          effects: {
            borderRadius: 'md',
            shadows: 'subtle',
          },
        },
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.tokens.effects?.borderRadius).toBe('md');
      expect(result.tokens.effects?.shadows).toBe('subtle');
    });

    it('should allow missing effects (optional)', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: createMinimalTypography(),
          colors: createMinimalColors(),
          spacing: createMinimalSpacing(),
        },
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.tokens.effects).toBeUndefined();
    });
  });

  describe('layout parsing', () => {
    it('should parse single-column layout', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: {
          type: 'single-column',
          paperSize: 'a4',
          margins: 'normal',
        },
      };

      const result = ThemeParser.parse(input);

      expect(result.layout.type).toBe('single-column');
      expect(result.layout.paperSize).toBe('a4');
    });

    it('should parse two-column layout with distribution', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: {
          type: 'two-column',
          paperSize: 'letter',
          margins: 'compact',
          columnDistribution: '30-70',
        },
      };

      const result = ThemeParser.parse(input);

      expect(result.layout.type).toBe('two-column');
      expect(result.layout.columnDistribution).toBe('30-70');
    });

    it('should throw for invalid layout type', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: {
          type: 'three-column', // Invalid
          paperSize: 'a4',
          margins: 'normal',
        },
      };

      expect(() => ThemeParser.parse(input)).toThrow(ThemeParseError);
    });
  });

  describe('derived tokens parsing', () => {
    it('should parse derived tokens with expressions', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
        derived: {
          primaryLight: '${lighten(colors.primary, 15)}',
          sectionGap: '${spacing.unit * 6}px',
          headerBorder: '2px solid ${colors.primary}',
        },
      };

      const result = ThemeParser.parse(input);

      expect(result.derived?.primaryLight).toBe('${lighten(colors.primary, 15)}');
      expect(result.derived?.sectionGap).toBe('${spacing.unit * 6}px');
    });

    it('should allow missing derived (optional)', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.parse(input);

      expect(result.derived).toBeUndefined();
    });
  });

  describe('variants parsing', () => {
    it('should parse conditional variants', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
        variants: [
          {
            when: "context.media == 'print'",
            apply: {
              colors: { background: '#ffffff' },
              effects: { shadows: 'none' },
            },
          },
        ],
      };

      const result = ThemeParser.parse(input);

      expect(result.variants).toHaveLength(1);
      expect(result.variants?.[0].when).toBe("context.media == 'print'");
    });

    it('should parse multiple variants', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
        variants: [
          {
            when: "context.media == 'print'",
            apply: { effects: { shadows: 'none' } },
          },
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

      const result = ThemeParser.parse(input);

      expect(result.variants).toHaveLength(2);
    });
  });

  describe('sections parsing', () => {
    it('should parse section styles', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
        sections: {
          experience: {
            container: { marginBottom: '${spacing.unit * 4}px' },
            title: { fontSize: '1.25rem', fontWeight: 600 },
            item: { borderLeft: '2px solid ${colors.primary}' },
          },
          education: {
            container: { marginBottom: '${spacing.unit * 3}px' },
          },
        },
      };

      const result = ThemeParser.parse(input);

      expect(result.sections?.experience).toBeDefined();
      expect(result.sections?.experience.title?.fontSize).toBe('1.25rem');
    });
  });

  describe('error handling', () => {
    it('should provide detailed error path for nested errors', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: {
          typography: {
            fontFamily: { heading: 'invalid-font', body: 'inter' },
            fontSize: 'base',
            headingStyle: 'bold',
          },
          colors: createMinimalColors(),
          spacing: createMinimalSpacing(),
        },
        layout: createMinimalLayout(),
      };

      try {
        ThemeParser.parse(input);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ThemeParseError);
        expect((error as ThemeParseError).path).toContain('fontFamily');
      }
    });

    it('should validate theme and return errors without throwing', () => {
      const input = {
        meta: { name: 'Test' }, // Missing version
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.validate(input);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should return success for valid theme', () => {
      const input = {
        meta: createMinimalMeta(),
        tokens: createMinimalTokens(),
        layout: createMinimalLayout(),
      };

      const result = ThemeParser.validate(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('complete theme parsing', () => {
    it('should parse a complete modern professional theme', () => {
      const input = {
        meta: {
          version: '1.0.0',
          name: 'Modern Professional',
          description: 'A clean, modern resume theme',
        },
        tokens: {
          typography: {
            fontFamily: { heading: 'inter', body: 'inter' },
            fontSize: { base: 'base', scale: 1.25 },
            headingStyle: 'accent-border',
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
            sectionGap: 'lg',
            itemGap: 'md',
          },
          effects: {
            borderRadius: 'sm',
            shadows: 'subtle',
          },
        },
        derived: {
          primaryLight: '${lighten(colors.primary, 15)}',
          sectionGapPx: '${spacing.unit * 6}px',
        },
        layout: {
          type: 'single-column',
          paperSize: 'a4',
          margins: 'normal',
        },
        variants: [
          {
            when: "context.media == 'print'",
            apply: {
              effects: { shadows: 'none' },
            },
          },
        ],
      };

      const result = ThemeParser.parse(input);

      expect(result.meta.name).toBe('Modern Professional');
      expect(result.tokens.typography.fontFamily.heading).toBe('inter');
      expect(result.tokens.colors.primary).toBe('#2563eb');
      expect(result.layout.type).toBe('single-column');
      expect(result.variants).toHaveLength(1);
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createMinimalMeta() {
  return {
    version: '1.0.0',
    name: 'Test Theme',
  };
}

function createMinimalTypography() {
  return {
    fontFamily: { heading: 'inter', body: 'inter' },
    fontSize: 'base',
    headingStyle: 'bold',
  };
}

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

function createMinimalSpacing() {
  return {
    unit: 4,
    density: 'comfortable',
  };
}

function createMinimalTokens() {
  return {
    typography: createMinimalTypography(),
    colors: createMinimalColors(),
    spacing: createMinimalSpacing(),
  };
}

function createMinimalLayout() {
  return {
    type: 'single-column',
    paperSize: 'a4',
    margins: 'normal',
  };
}
