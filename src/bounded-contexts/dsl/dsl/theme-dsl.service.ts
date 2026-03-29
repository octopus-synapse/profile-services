/**
 * Theme DSL Service
 *
 * Orchestrates theme parsing, compilation, and utilities.
 * Main entry point for working with theme definitions.
 */

import { Injectable } from '@nestjs/common';
import { ThemeCompiler } from '../application/compilers/theme-compiler';
import { TokenEvaluator } from '../application/compilers/token-evaluator';
import { ThemeParseError, ThemeParser } from '../application/parsers/theme-parser';
import type { RenderContext } from '../domain/schemas/dsl/context.schema';
import type { CompiledThemeAst, ThemeDefinition } from '../domain/schemas/dsl/theme-ast.schema';

/**
 * Error thrown during theme compilation.
 */
export class ThemeCompilationError extends Error {
  constructor(
    message: string,
    public readonly issues: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ThemeCompilationError';
  }
}

/**
 * Result of theme validation.
 */
export interface ThemeValidationResult {
  valid: boolean;
  errors?: Array<{ path: string; message: string }>;
}

@Injectable()
export class ThemeDslService {
  private readonly compiler: ThemeCompiler;
  private readonly cache: Map<string, CompiledThemeAst>;

  constructor() {
    this.compiler = new ThemeCompiler();
    this.cache = new Map();
  }

  /**
   * Compile a theme definition to a resolved theme AST.
   * Throws ThemeCompilationError if validation fails.
   */
  compileFromDefinition(definition: unknown): CompiledThemeAst {
    // Parse and validate
    let parsed: ThemeDefinition;
    try {
      parsed = ThemeParser.parse(definition);
    } catch (error) {
      if (error instanceof ThemeParseError) {
        throw new ThemeCompilationError(error.message, error.issues);
      }
      throw error;
    }

    // Check cache
    const cacheKey = JSON.stringify(parsed);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Compile
    const compiled = this.compiler.compile(parsed);

    // Cache result
    this.cache.set(cacheKey, compiled);

    return compiled;
  }

  /**
   * Compile a theme with a specific render context.
   * Used for applying variants based on media, color scheme, etc.
   */
  compileWithContext(definition: unknown, context: RenderContext): CompiledThemeAst {
    // Parse and validate
    let parsed: ThemeDefinition;
    try {
      parsed = ThemeParser.parse(definition);
    } catch (error) {
      if (error instanceof ThemeParseError) {
        throw new ThemeCompilationError(error.message, error.issues);
      }
      throw error;
    }

    // Compile with context (no caching for context-specific compilation)
    return this.compiler.compile(parsed, context);
  }

  /**
   * Validate a theme definition without compiling.
   * Returns validation result with any errors.
   */
  validateDefinition(definition: unknown): ThemeValidationResult {
    const result = ThemeParser.validate(definition);

    if (result.success) {
      return { valid: true };
    }

    return {
      valid: false,
      errors: result.errors,
    };
  }

  /**
   * Resolve a single expression against a context.
   */
  resolveExpression(expression: string, context: Record<string, unknown>): string {
    const evaluator = new TokenEvaluator(context);
    return evaluator.evaluateString(expression);
  }

  /**
   * Merge a base theme with custom overrides.
   * Performs deep merge, preserving unoverridden values.
   */
  mergeThemes(
    baseTheme: ThemeDefinition,
    customOverrides: Record<string, unknown>,
  ): ThemeDefinition {
    const merged = { ...baseTheme };

    // Merge tokens
    if (
      customOverrides.colors ||
      customOverrides.typography ||
      customOverrides.spacing ||
      customOverrides.effects
    ) {
      merged.tokens = { ...baseTheme.tokens };

      if (customOverrides.colors) {
        merged.tokens.colors = this.deepMerge(
          baseTheme.tokens.colors,
          customOverrides.colors as object,
        );
      }

      if (customOverrides.typography) {
        merged.tokens.typography = this.deepMerge(
          baseTheme.tokens.typography,
          customOverrides.typography as object,
        );
      }

      if (customOverrides.spacing) {
        merged.tokens.spacing = this.deepMerge(
          baseTheme.tokens.spacing,
          customOverrides.spacing as object,
        );
      }

      if (customOverrides.effects) {
        const defaultEffects = { borderRadius: 'none' as const, shadows: 'none' as const };
        merged.tokens.effects = this.deepMerge(
          baseTheme.tokens.effects || defaultEffects,
          customOverrides.effects as object,
        );
      }
    }

    // Merge layout
    if (customOverrides.layout) {
      merged.layout = this.deepMerge(baseTheme.layout, customOverrides.layout as object);
    }

    // Merge derived
    if (customOverrides.derived) {
      merged.derived = {
        ...baseTheme.derived,
        ...(customOverrides.derived as Record<string, string>),
      };
    }

    // Merge sections
    if (customOverrides.sections) {
      merged.sections = this.deepMerge(
        baseTheme.sections || {},
        customOverrides.sections as object,
      );
    }

    return merged;
  }

  /**
   * Generate CSS custom properties from a compiled theme.
   */
  generateStyleVariables(compiled: CompiledThemeAst): Record<string, string> {
    const variables: Record<string, string> = {};

    // Colors
    variables['--color-primary'] = compiled.tokens.colors.primary;
    variables['--color-secondary'] = compiled.tokens.colors.secondary;
    variables['--color-background'] = compiled.tokens.colors.background;
    variables['--color-surface'] = compiled.tokens.colors.surface;
    variables['--color-text-primary'] = compiled.tokens.colors.text.primary;
    variables['--color-text-secondary'] = compiled.tokens.colors.text.secondary;
    variables['--color-text-accent'] = compiled.tokens.colors.text.accent;
    variables['--color-border'] = compiled.tokens.colors.border;
    variables['--color-divider'] = compiled.tokens.colors.divider;

    if (compiled.tokens.colors.accent) {
      variables['--color-accent'] = compiled.tokens.colors.accent;
    }
    if (compiled.tokens.colors.text.muted) {
      variables['--color-text-muted'] = compiled.tokens.colors.text.muted;
    }

    // Typography
    variables['--font-family-heading'] = compiled.tokens.typography.fontFamily.heading;
    variables['--font-family-body'] = compiled.tokens.typography.fontFamily.body;
    if (compiled.tokens.typography.fontFamily.mono) {
      variables['--font-family-mono'] = compiled.tokens.typography.fontFamily.mono;
    }

    variables['--font-size-base'] = `${compiled.tokens.typography.fontSize.base}px`;
    variables['--font-size-heading'] = `${compiled.tokens.typography.fontSize.heading}px`;
    variables['--font-size-scale'] = String(compiled.tokens.typography.fontSize.scale);

    variables['--font-weight-normal'] = String(compiled.tokens.typography.fontWeight.normal);
    variables['--font-weight-medium'] = String(compiled.tokens.typography.fontWeight.medium);
    variables['--font-weight-semibold'] = String(compiled.tokens.typography.fontWeight.semibold);
    variables['--font-weight-bold'] = String(compiled.tokens.typography.fontWeight.bold);

    variables['--line-height-tight'] = String(compiled.tokens.typography.lineHeight.tight);
    variables['--line-height-base'] = String(compiled.tokens.typography.lineHeight.base);
    variables['--line-height-relaxed'] = String(compiled.tokens.typography.lineHeight.relaxed);

    // Spacing
    variables['--spacing-unit'] = `${compiled.tokens.spacing.unit}px`;
    variables['--spacing-density'] = String(compiled.tokens.spacing.density);
    variables['--spacing-section-gap'] = `${compiled.tokens.spacing.sectionGap}px`;
    variables['--spacing-item-gap'] = `${compiled.tokens.spacing.itemGap}px`;
    variables['--spacing-content-padding'] = `${compiled.tokens.spacing.contentPadding}px`;

    // Effects
    variables['--border-radius'] = `${compiled.tokens.effects.borderRadius}px`;
    variables['--shadow'] = compiled.tokens.effects.shadows;

    return variables;
  }

  /**
   * Clear the compilation cache.
   */
  clearCache(): void {
    this.cache.clear();
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
}
