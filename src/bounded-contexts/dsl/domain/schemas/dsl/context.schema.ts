/**
 * Theme Context Schema
 *
 * Zod schemas for theme rendering context.
 * Context provides runtime information for conditional theme evaluation.
 */

import { z } from 'zod';

// =============================================================================
// Media Context
// =============================================================================

export const MediaTypeSchema = z.enum(['screen', 'print']);

export const ColorSchemeSchema = z.enum(['light', 'dark']);

// =============================================================================
// Page Context
// =============================================================================

export const PageContextSchema = z.object({
  number: z.number().int().positive(),
  isFirst: z.boolean(),
  isLast: z.boolean(),
  totalPages: z.number().int().positive().optional(),
});

// =============================================================================
// Section Context
// =============================================================================

export const SectionContextSchema = z.object({
  id: z.string(),
  type: z.string(),
  isEmpty: z.boolean(),
  itemCount: z.number().int().min(0),
  isFirst: z.boolean().optional(),
  isLast: z.boolean().optional(),
});

// =============================================================================
// Item Context
// =============================================================================

export const ItemContextSchema = z.object({
  index: z.number().int().min(0),
  isFirst: z.boolean(),
  isLast: z.boolean(),
  highlighted: z.boolean().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// User Preferences Context
// =============================================================================

export const UserPreferencesSchema = z.object({
  reducedMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  fontSize: z.enum(['default', 'large', 'larger']).optional(),
});

// =============================================================================
// Complete Render Context
// =============================================================================

export const RenderContextSchema = z.object({
  media: MediaTypeSchema,
  colorScheme: ColorSchemeSchema,
  page: PageContextSchema.optional(),
  section: SectionContextSchema.optional(),
  item: ItemContextSchema.optional(),
  preferences: UserPreferencesSchema.optional(),
  customData: z.record(z.string(), z.unknown()).optional(),
});

// =============================================================================
// Minimal Context (for initial evaluation)
// =============================================================================

export const MinimalContextSchema = z.object({
  media: MediaTypeSchema.default('screen'),
  colorScheme: ColorSchemeSchema.default('light'),
});

// =============================================================================
// Type Exports
// =============================================================================

export type MediaType = z.infer<typeof MediaTypeSchema>;
export type ColorScheme = z.infer<typeof ColorSchemeSchema>;
export type PageContext = z.infer<typeof PageContextSchema>;
export type SectionContext = z.infer<typeof SectionContextSchema>;
export type ItemContext = z.infer<typeof ItemContextSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type RenderContext = z.infer<typeof RenderContextSchema>;
export type MinimalContext = z.infer<typeof MinimalContextSchema>;

// =============================================================================
// Context Helpers
// =============================================================================

/**
 * Create a default render context for initial theme compilation.
 */
export function createDefaultContext(): RenderContext {
  return {
    media: 'screen',
    colorScheme: 'light',
  };
}

/**
 * Create a print context for PDF export.
 */
export function createPrintContext(): RenderContext {
  return {
    media: 'print',
    colorScheme: 'light',
  };
}

/**
 * Merge partial context with defaults.
 */
export function mergeContext(partial: Partial<RenderContext>): RenderContext {
  return {
    ...createDefaultContext(),
    ...partial,
  };
}
