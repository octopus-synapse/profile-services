/**
 * Generic Section Data Schema
 *
 * Definition-driven AST structure for section data.
 * No discriminated union - all sections have the same structure.
 *
 * ARCHITECTURE NOTE:
 * Section rendering is driven by section metadata rather than shape-specific unions.
 *
 * The rendering logic (frontend) uses semanticKind + SectionType.definition
 * to determine how to display each item. This enables:
 * - Zero code changes for new section types
 * - Dynamic field rendering based on definition.export.docx
 * - Consistent structure across all sections
 */

import { z } from 'zod';

/**
 * Generic item with JSON content.
 * Content fields are validated against SectionType.definition.
 */
export const GenericItemSchema = z.object({
  id: z.string(),
  content: z.record(z.unknown()),
});

export type GenericItem = z.infer<typeof GenericItemSchema>;

/**
 * Generic section data schema.
 * All sections have the same structure.
 */
export const GenericSectionDataSchema = z.object({
  semanticKind: z.string(),
  sectionTypeKey: z.string(),
  title: z.string(),
  items: z.array(GenericItemSchema),
});

export type GenericSectionData = z.infer<typeof GenericSectionDataSchema>;

/**
 * Text section data (for summary, objective).
 * These don't have items, just text content.
 */
export const GenericTextSectionDataSchema = z.object({
  semanticKind: z.string(),
  sectionTypeKey: z.string(),
  title: z.string(),
  content: z.string(),
});

export type GenericTextSectionData = z.infer<typeof GenericTextSectionDataSchema>;

/**
 * Union type for all section data types.
 */
export const SectionDataV2Schema = z.union([
  GenericSectionDataSchema,
  GenericTextSectionDataSchema,
]);

export type SectionDataV2 = z.infer<typeof SectionDataV2Schema>;

/**
 * Date range schema (shared helper).
 */
export const DateRangeV2Schema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
});

export type DateRangeV2 = z.infer<typeof DateRangeV2Schema>;

/**
 * Location schema (shared helper).
 */
export const LocationV2Schema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  remote: z.boolean().optional(),
});

export type LocationV2 = z.infer<typeof LocationV2Schema>;
