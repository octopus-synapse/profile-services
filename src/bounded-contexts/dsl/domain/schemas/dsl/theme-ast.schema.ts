/**
 * Theme AST Schema
 *
 * Zod schemas for validated theme definitions and compiled theme AST.
 */

import { z } from 'zod';

// =============================================================================
// Core Token Schemas
// =============================================================================

export const FontFamilySchema = z.enum([
  'inter',
  'roboto',
  'poppins',
  'merriweather',
  'playfair-display',
  'source-sans-pro',
  'open-sans',
  'lato',
  'montserrat',
  'raleway',
]);

export const FontSizeScaleSchema = z.enum(['sm', 'base', 'lg']);

export const HeadingStyleSchema = z.enum([
  'bold',
  'underline',
  'uppercase',
  'accent-border',
  'minimal',
]);

export const DensitySchema = z.enum(['compact', 'comfortable', 'spacious']);

export const SpacingSizeSchema = z.enum(['sm', 'md', 'lg', 'xl']);

export const BorderRadiusSchema = z.enum(['none', 'sm', 'md', 'lg', 'full']);

export const ShadowSchema = z.enum(['none', 'subtle', 'medium', 'strong']);

// =============================================================================
// Typography Tokens
// =============================================================================

export const TypographyTokensSchema = z.object({
  fontFamily: z.object({
    heading: FontFamilySchema,
    body: FontFamilySchema,
    mono: FontFamilySchema.optional(),
  }),
  fontSize: z
    .object({
      base: FontSizeScaleSchema,
      scale: z.number().min(1).max(2).default(1.25),
    })
    .or(FontSizeScaleSchema), // Allow shorthand
  fontWeight: z
    .object({
      normal: z.number().default(400),
      medium: z.number().default(500),
      semibold: z.number().default(600),
      bold: z.number().default(700),
    })
    .optional(),
  lineHeight: z
    .object({
      tight: z.number().default(1.25),
      base: z.number().default(1.5),
      relaxed: z.number().default(1.75),
    })
    .optional(),
  headingStyle: HeadingStyleSchema,
});

// =============================================================================
// Color Tokens
// =============================================================================

const ColorValueSchema = z.string(); // Can be hex, rgb, rgba, or expression

export const ColorTokensSchema = z.object({
  primary: ColorValueSchema,
  secondary: ColorValueSchema,
  accent: ColorValueSchema.optional(),
  background: ColorValueSchema,
  surface: ColorValueSchema,
  text: z.object({
    primary: ColorValueSchema,
    secondary: ColorValueSchema,
    muted: ColorValueSchema.optional(),
    accent: ColorValueSchema,
  }),
  border: ColorValueSchema,
  divider: ColorValueSchema,
});

// =============================================================================
// Spacing Tokens
// =============================================================================

export const SpacingTokensSchema = z.object({
  unit: z.number().default(4),
  density: DensitySchema,
  scale: z.array(z.number()).optional(),
  sectionGap: SpacingSizeSchema.optional(),
  itemGap: SpacingSizeSchema.optional(),
  contentPadding: SpacingSizeSchema.optional(),
});

// =============================================================================
// Effects Tokens
// =============================================================================

export const EffectsTokensSchema = z.object({
  borderRadius: BorderRadiusSchema,
  shadows: ShadowSchema,
  gradients: z
    .object({
      enabled: z.boolean(),
      direction: z.string().optional(),
    })
    .optional(),
});

// =============================================================================
// Combined Design Tokens
// =============================================================================

export const DesignTokensSchema = z.object({
  typography: TypographyTokensSchema,
  colors: ColorTokensSchema,
  spacing: SpacingTokensSchema,
  effects: EffectsTokensSchema.optional(),
});

// =============================================================================
// Derived Tokens (Expressions)
// =============================================================================

export const DerivedTokensSchema = z.record(z.string(), z.string());

// =============================================================================
// Theme Variants
// =============================================================================

export const VariantConditionSchema = z.string(); // Expression string

export const VariantSchema = z.object({
  when: VariantConditionSchema,
  apply: z.record(z.string(), z.unknown()),
});

// =============================================================================
// Layout Configuration
// =============================================================================

export const LayoutTypeSchema = z.enum([
  'single-column',
  'two-column',
  'sidebar-left',
  'sidebar-right',
  'magazine',
  'compact',
]);

export const PaperSizeSchema = z.enum(['a4', 'letter', 'legal']);

export const MarginsSchema = z.enum(['compact', 'normal', 'relaxed', 'wide']);

export const ColumnDistributionSchema = z.enum(['50-50', '60-40', '65-35', '70-30', '30-70']);

export const LayoutConfigSchema = z.object({
  type: LayoutTypeSchema,
  paperSize: PaperSizeSchema,
  margins: MarginsSchema,
  columnDistribution: ColumnDistributionSchema.optional(),
  pageBreakBehavior: z.enum(['auto', 'section-aware', 'manual']).optional(),
  showPageNumbers: z.boolean().optional(),
  pageNumberPosition: z.string().optional(),
});

// =============================================================================
// Section Styles
// =============================================================================

export const SectionStyleSchema = z.object({
  container: z.record(z.string(), z.unknown()).optional(),
  title: z.record(z.string(), z.unknown()).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  item: z.record(z.string(), z.unknown()).optional(),
});

export const SectionStylesSchema = z.record(z.string(), SectionStyleSchema);

// =============================================================================
// Theme Meta
// =============================================================================

export const ThemeMetaSchema = z.object({
  version: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

// =============================================================================
// Complete Theme Definition (Input)
// =============================================================================

export const ThemeDefinitionSchema = z.object({
  meta: ThemeMetaSchema,
  tokens: DesignTokensSchema,
  derived: DerivedTokensSchema.optional(),
  layout: LayoutConfigSchema,
  variants: z.array(VariantSchema).optional(),
  sections: SectionStylesSchema.optional(),
});

// =============================================================================
// Compiled Theme AST (Output)
// =============================================================================

export const ResolvedTypographySchema = z.object({
  fontFamily: z.object({
    heading: z.string(),
    body: z.string(),
    mono: z.string().optional(),
  }),
  fontSize: z.object({
    base: z.number(),
    heading: z.number(),
    scale: z.number(),
  }),
  fontWeight: z.object({
    normal: z.number(),
    medium: z.number(),
    semibold: z.number(),
    bold: z.number(),
  }),
  lineHeight: z.object({
    tight: z.number(),
    base: z.number(),
    relaxed: z.number(),
  }),
  headingStyle: z.object({
    fontWeight: z.number(),
    textTransform: z.string().optional(),
    borderLeft: z.string().optional(),
    borderBottom: z.string().optional(),
    paddingLeft: z.number().optional(),
  }),
});

export const ResolvedColorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string().optional(),
  background: z.string(),
  surface: z.string(),
  text: z.object({
    primary: z.string(),
    secondary: z.string(),
    muted: z.string().optional(),
    accent: z.string(),
  }),
  border: z.string(),
  divider: z.string(),
});

export const ResolvedSpacingSchema = z.object({
  unit: z.number(),
  density: z.number(), // Multiplier
  sectionGap: z.number(),
  itemGap: z.number(),
  contentPadding: z.number(),
});

export const ResolvedEffectsSchema = z.object({
  borderRadius: z.number(),
  shadows: z.string(),
});

export const ResolvedTokensSchema = z.object({
  typography: ResolvedTypographySchema,
  colors: ResolvedColorsSchema,
  spacing: ResolvedSpacingSchema,
  effects: ResolvedEffectsSchema,
  derived: z.record(z.string(), z.unknown()).optional(),
});

export const CompiledThemeAstSchema = z.object({
  meta: z.object({
    version: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    compiledAt: z.string(),
    sourceHash: z.string(),
  }),
  tokens: ResolvedTokensSchema,
  layout: LayoutConfigSchema,
  sectionStyles: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type FontFamily = z.infer<typeof FontFamilySchema>;
export type FontSizeScale = z.infer<typeof FontSizeScaleSchema>;
export type HeadingStyle = z.infer<typeof HeadingStyleSchema>;
export type Density = z.infer<typeof DensitySchema>;
export type SpacingSize = z.infer<typeof SpacingSizeSchema>;
export type BorderRadius = z.infer<typeof BorderRadiusSchema>;
export type Shadow = z.infer<typeof ShadowSchema>;
export type LayoutType = z.infer<typeof LayoutTypeSchema>;
export type PaperSize = z.infer<typeof PaperSizeSchema>;
export type Margins = z.infer<typeof MarginsSchema>;

export type TypographyTokens = z.infer<typeof TypographyTokensSchema>;
export type ColorTokens = z.infer<typeof ColorTokensSchema>;
export type SpacingTokens = z.infer<typeof SpacingTokensSchema>;
export type EffectsTokens = z.infer<typeof EffectsTokensSchema>;
export type DesignTokens = z.infer<typeof DesignTokensSchema>;
export type DerivedTokens = z.infer<typeof DerivedTokensSchema>;
export type Variant = z.infer<typeof VariantSchema>;
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;
export type SectionStyle = z.infer<typeof SectionStyleSchema>;
export type ThemeMeta = z.infer<typeof ThemeMetaSchema>;
export type ThemeDefinition = z.infer<typeof ThemeDefinitionSchema>;

export type ResolvedTypography = z.infer<typeof ResolvedTypographySchema>;
export type ResolvedColors = z.infer<typeof ResolvedColorsSchema>;
export type ResolvedSpacing = z.infer<typeof ResolvedSpacingSchema>;
export type ResolvedEffects = z.infer<typeof ResolvedEffectsSchema>;
export type ResolvedTokens = z.infer<typeof ResolvedTokensSchema>;
export type CompiledThemeAst = z.infer<typeof CompiledThemeAstSchema>;
