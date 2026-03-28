/**
 * Theme Compiler
 *
 * Compiles theme definitions into resolved theme ASTs.
 * Resolves all expressions, applies variants, and generates compiled output.
 */

import { createHash } from 'node:crypto';
import type { RenderContext } from '../../domain/schemas/dsl/context.schema';
import type {
  BorderRadius,
  CompiledThemeAst,
  Density,
  FontFamily,
  FontSizeScale,
  HeadingStyle,
  Shadow,
  SpacingSize,
  ThemeDefinition,
} from '../../domain/schemas/dsl/theme-ast.schema';
import { ExpressionParser } from '../parsers/expression-parser';
import { TokenEvaluator } from './token-evaluator';

// =============================================================================
// Font Family Mappings
// =============================================================================

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  inter: 'Inter, sans-serif',
  roboto: 'Roboto, sans-serif',
  poppins: 'Poppins, sans-serif',
  merriweather: 'Merriweather, serif',
  'playfair-display': 'Playfair Display, serif',
  'source-sans-pro': 'Source Sans Pro, sans-serif',
  'open-sans': 'Open Sans, sans-serif',
  lato: 'Lato, sans-serif',
  montserrat: 'Montserrat, sans-serif',
  raleway: 'Raleway, sans-serif',
};

// =============================================================================
// Size Mappings
// =============================================================================

const FONT_SIZE_MAP: Record<FontSizeScale, number> = {
  sm: 14,
  base: 16,
  lg: 18,
};

const DENSITY_MAP: Record<Density, number> = {
  compact: 0.85,
  comfortable: 1,
  spacious: 1.25,
};

const SPACING_SIZE_MAP: Record<SpacingSize, number> = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
};

const BORDER_RADIUS_MAP: Record<BorderRadius, number> = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
};

const SHADOW_MAP: Record<Shadow, string> = {
  none: 'none',
  subtle: 'box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05)',
  medium: 'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)',
  strong: 'box-shadow: 0 10px 15px rgba(0, 0, 0, 0.15)',
};

// =============================================================================
// Heading Style Resolution
// =============================================================================

interface ResolvedHeadingStyle {
  fontWeight: number;
  textTransform?: string;
  borderLeft?: string;
  borderBottom?: string;
  paddingLeft?: number;
}

function resolveHeadingStyle(style: HeadingStyle, primaryColor: string): ResolvedHeadingStyle {
  switch (style) {
    case 'bold':
      return { fontWeight: 700 };

    case 'underline':
      return {
        fontWeight: 600,
        borderBottom: `2px solid ${primaryColor}`,
      };

    case 'uppercase':
      return {
        fontWeight: 600,
        textTransform: 'uppercase',
      };

    case 'accent-border':
      return {
        fontWeight: 600,
        borderLeft: `4px solid ${primaryColor}`,
        paddingLeft: 12,
      };

    case 'minimal':
      return { fontWeight: 500 };

    default:
      return { fontWeight: 600 };
  }
}

// =============================================================================
// Theme Compiler
// =============================================================================

export class ThemeCompiler {
  /**
   * Compile a theme definition into a resolved theme AST.
   */
  compile(theme: ThemeDefinition, context?: RenderContext): CompiledThemeAst {
    const ctx = context || { media: 'screen', colorScheme: 'light' };

    // Apply variants to get effective tokens
    const effectiveTheme = this.applyVariants(theme, ctx);

    // Build evaluation context from tokens
    const evalContext = this.buildEvaluationContext(effectiveTheme);

    // Resolve tokens
    const resolvedTypography = this.resolveTypography(effectiveTheme, evalContext);
    const resolvedColors = this.resolveColors(effectiveTheme, evalContext);
    const resolvedSpacing = this.resolveSpacing(effectiveTheme);
    const resolvedEffects = this.resolveEffects(effectiveTheme);
    const resolvedDerived = this.resolveDerived(effectiveTheme, evalContext);
    const resolvedSectionStyles = this.resolveSectionStyles(effectiveTheme, evalContext);

    return {
      meta: {
        version: theme.meta.version,
        name: theme.meta.name,
        description: theme.meta.description ?? null,
        compiledAt: new Date().toISOString(),
        sourceHash: this.computeSourceHash(theme),
      },
      tokens: {
        typography: resolvedTypography,
        colors: resolvedColors,
        spacing: resolvedSpacing,
        effects: resolvedEffects,
        derived: resolvedDerived,
      },
      layout: effectiveTheme.layout,
      sectionStyles: resolvedSectionStyles,
    };
  }

  private applyVariants(theme: ThemeDefinition, context: RenderContext): ThemeDefinition {
    if (!theme.variants || theme.variants.length === 0) {
      return theme;
    }

    let effectiveTheme = { ...theme, tokens: { ...theme.tokens } };

    for (const variant of theme.variants) {
      if (this.evaluateCondition(variant.when, context)) {
        effectiveTheme = this.mergeVariant(effectiveTheme, variant.apply);
      }
    }

    return effectiveTheme;
  }

  private evaluateCondition(condition: string, context: RenderContext): boolean {
    const evaluator = new TokenEvaluator({ context });
    // Wrap condition in ${} if not already wrapped for expression parsing
    const wrapped = condition.includes('${') ? condition : `\${${condition}}`;
    const parser = new ExpressionParser(wrapped);
    const expr = parser.parse();
    const result = evaluator.evaluate(expr);
    return Boolean(result);
  }

  private mergeVariant(theme: ThemeDefinition, apply: Record<string, unknown>): ThemeDefinition {
    const result = { ...theme };

    if (apply.colors) {
      result.tokens = {
        ...result.tokens,
        colors: this.deepMerge(result.tokens.colors, apply.colors as object),
      };
    }

    if (apply.effects) {
      const defaultEffects = { borderRadius: 'none' as const, shadows: 'none' as const };
      result.tokens = {
        ...result.tokens,
        effects: this.deepMerge(result.tokens.effects || defaultEffects, apply.effects as object),
      };
    }

    if (apply.typography) {
      result.tokens = {
        ...result.tokens,
        typography: this.deepMerge(result.tokens.typography, apply.typography as object),
      };
    }

    if (apply.spacing) {
      result.tokens = {
        ...result.tokens,
        spacing: this.deepMerge(result.tokens.spacing, apply.spacing as object),
      };
    }

    return result;
  }

  private deepMerge<T extends object>(target: T, source: object): T {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const targetValue = (result as Record<string, unknown>)[key];
        if (targetValue && typeof targetValue === 'object') {
          (result as Record<string, unknown>)[key] = this.deepMerge(targetValue as object, value);
        } else {
          (result as Record<string, unknown>)[key] = value;
        }
      } else {
        (result as Record<string, unknown>)[key] = value;
      }
    }

    return result;
  }

  private buildEvaluationContext(theme: ThemeDefinition): Record<string, unknown> {
    return {
      colors: theme.tokens.colors,
      spacing: {
        unit: theme.tokens.spacing.unit ?? 4,
        density: theme.tokens.spacing.density,
        sectionGap: theme.tokens.spacing.sectionGap,
        itemGap: theme.tokens.spacing.itemGap,
      },
      typography: {
        fontFamily: theme.tokens.typography.fontFamily,
        headingStyle: theme.tokens.typography.headingStyle,
      },
    };
  }

  private resolveTypography(theme: ThemeDefinition, evalContext: Record<string, unknown>) {
    const typography = theme.tokens.typography;
    const fontSize = typography.fontSize;

    let baseSize: number;
    let scale: number;
    if (typeof fontSize === 'string') {
      baseSize = FONT_SIZE_MAP[fontSize];
      scale = 1.25;
    } else {
      baseSize = FONT_SIZE_MAP[fontSize.base];
      scale = fontSize.scale ?? 1.25;
    }

    const headingSize = Math.round(baseSize * scale * scale);
    // biome-ignore lint/complexity/useLiteralKeys: dynamic theme context property
    const primaryColor = String(evalContext.colors?.['primary'] || '#2563eb');

    return {
      fontFamily: {
        heading: FONT_FAMILY_MAP[typography.fontFamily.heading],
        body: FONT_FAMILY_MAP[typography.fontFamily.body],
        mono: typography.fontFamily.mono ? FONT_FAMILY_MAP[typography.fontFamily.mono] : undefined,
      },
      fontSize: {
        base: baseSize,
        heading: headingSize,
        scale,
      },
      fontWeight: {
        normal: typography.fontWeight?.normal ?? 400,
        medium: typography.fontWeight?.medium ?? 500,
        semibold: typography.fontWeight?.semibold ?? 600,
        bold: typography.fontWeight?.bold ?? 700,
      },
      lineHeight: {
        tight: typography.lineHeight?.tight ?? 1.25,
        base: typography.lineHeight?.base ?? 1.5,
        relaxed: typography.lineHeight?.relaxed ?? 1.75,
      },
      headingStyle: resolveHeadingStyle(typography.headingStyle, primaryColor),
    };
  }

  private resolveColors(theme: ThemeDefinition, evalContext: Record<string, unknown>) {
    const colors = theme.tokens.colors;
    const evaluator = new TokenEvaluator(evalContext);

    return {
      primary: this.resolveColorValue(colors.primary, evaluator),
      secondary: this.resolveColorValue(colors.secondary, evaluator),
      accent: colors.accent ? this.resolveColorValue(colors.accent, evaluator) : undefined,
      background: this.resolveColorValue(colors.background, evaluator),
      surface: this.resolveColorValue(colors.surface, evaluator),
      text: {
        primary: this.resolveColorValue(colors.text.primary, evaluator),
        secondary: this.resolveColorValue(colors.text.secondary, evaluator),
        muted: colors.text.muted ? this.resolveColorValue(colors.text.muted, evaluator) : undefined,
        accent: this.resolveColorValue(colors.text.accent, evaluator),
      },
      border: this.resolveColorValue(colors.border, evaluator),
      divider: this.resolveColorValue(colors.divider, evaluator),
    };
  }

  private resolveColorValue(value: string, evaluator: TokenEvaluator): string {
    if (value.includes('${')) {
      return evaluator.evaluateString(value);
    }
    return value;
  }

  private resolveSpacing(theme: ThemeDefinition) {
    const spacing = theme.tokens.spacing;
    const unit = spacing.unit ?? 4;
    const density = DENSITY_MAP[spacing.density];

    const sectionGap = spacing.sectionGap
      ? unit * SPACING_SIZE_MAP[spacing.sectionGap] * density
      : unit * 6 * density;

    const itemGap = spacing.itemGap
      ? unit * SPACING_SIZE_MAP[spacing.itemGap] * density
      : unit * 4 * density;

    const contentPadding = spacing.contentPadding
      ? unit * SPACING_SIZE_MAP[spacing.contentPadding] * density
      : unit * 4 * density;

    return {
      unit,
      density,
      sectionGap,
      itemGap,
      contentPadding,
    };
  }

  private resolveEffects(theme: ThemeDefinition) {
    const effects = theme.tokens.effects || { borderRadius: 'none', shadows: 'none' };

    return {
      borderRadius: BORDER_RADIUS_MAP[effects.borderRadius],
      shadows: SHADOW_MAP[effects.shadows],
    };
  }

  private resolveDerived(
    theme: ThemeDefinition,
    evalContext: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!theme.derived) {
      return undefined;
    }

    const evaluator = new TokenEvaluator(evalContext);
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(theme.derived)) {
      resolved[key] = evaluator.evaluateString(value);
    }

    return resolved;
  }

  private resolveSectionStyles(
    theme: ThemeDefinition,
    evalContext: Record<string, unknown>,
  ): Record<string, Record<string, unknown>> | undefined {
    if (!theme.sections) {
      return undefined;
    }

    const evaluator = new TokenEvaluator(evalContext);
    const resolved: Record<string, Record<string, unknown>> = {};

    for (const [sectionKey, sectionStyle] of Object.entries(theme.sections)) {
      resolved[sectionKey] = {};

      for (const [styleKey, styleValue] of Object.entries(sectionStyle)) {
        if (styleValue && typeof styleValue === 'object') {
          resolved[sectionKey][styleKey] = this.resolveStyleObject(
            styleValue as Record<string, unknown>,
            evaluator,
          );
        }
      }
    }

    return resolved;
  }

  private resolveStyleObject(
    obj: Record<string, unknown>,
    evaluator: TokenEvaluator,
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.includes('${')) {
        resolved[key] = evaluator.evaluateString(value);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private computeSourceHash(theme: ThemeDefinition): string {
    const content = JSON.stringify(theme);
    return createHash('sha256').update(content).digest('hex').slice(0, 16);
  }
}
