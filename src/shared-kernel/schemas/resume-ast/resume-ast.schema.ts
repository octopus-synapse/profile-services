/**
 * Resume AST DTOs — Zod-first.
 *
 * Zod schemas (with `zod-to-openapi` annotations) for the Resume Abstract
 * Syntax Tree. Each shape exports both the schema and a `createZodDto`-
 * derived class so legacy `@nestjs/swagger` discovery paths still work,
 * while route descriptors can consume the schemas directly.
 *
 * ARCHITECTURE: The AST is fully generic. Section structure comes from
 * SectionType definitions and section item content, not from hardcoded DTOs.
 *
 * @see ../ast/generic-section-data.schema.ts for generic section schemas
 * @see ../ast/resume-ast.schema.ts for Zod validation schemas
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

extendZodWithOpenApi(z);

// ============================================================================
// Generic Section Types
// ============================================================================

export const GenericSectionItemSchema = z.object({
  id: z.string().openapi({ example: 'item_123' }),
  order: z.number().optional().openapi({ example: 0 }),
  content: z.record(z.string(), z.unknown()).openapi({
    type: 'object',
    additionalProperties: true,
    example: {
      title: 'Senior Software Engineer',
      company: 'Tech Company Inc.',
      startDate: '2020-01',
    },
  }),
});

export class GenericSectionItemDto extends createZodDto(GenericSectionItemSchema) {}

export const GenericSectionDataSchema = z.object({
  sectionTypeKey: z.string().openapi({ example: 'section_type_v1' }),
  semanticKind: z.string().optional().openapi({ example: 'custom_section' }),
  title: z.string().optional().openapi({ example: 'Selected Highlights' }),
  items: z.array(GenericSectionItemSchema).optional(),
  content: z.string().optional().openapi({ example: 'Markdown or plain text content' }),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .openapi({
      type: 'object',
      additionalProperties: true,
      example: { variant: 'timeline' },
    }),
});

export class GenericSectionDataDto extends createZodDto(GenericSectionDataSchema) {}

// ============================================================================
// Section Data Types
// ============================================================================

export const SectionDataSchema = GenericSectionDataSchema;
export class SectionDataDto extends createZodDto(SectionDataSchema) {}

// ============================================================================
// Style Types
// ============================================================================

export const ResolvedTypographySchema = z.object({
  fontFamily: z.string().openapi({ example: 'Inter, sans-serif' }),
  fontSizePx: z.number().openapi({ example: 16 }),
  lineHeight: z.number().openapi({ example: 1.5 }),
  fontWeight: z.number().openapi({ example: 400 }),
  textTransform: z
    .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
    .openapi({ example: 'none' }),
  textDecoration: z.enum(['none', 'underline', 'line-through']).openapi({ example: 'none' }),
});

export class ResolvedTypographyDto extends createZodDto(ResolvedTypographySchema) {}

export const ResolvedBoxStyleSchema = z.object({
  backgroundColor: z.string().openapi({ example: '#ffffff' }),
  borderColor: z.string().openapi({ example: '#e5e5e5' }),
  borderWidthPx: z.number().openapi({ example: 0 }),
  borderRadiusPx: z.number().openapi({ example: 8 }),
  paddingPx: z.number().openapi({ example: 16 }),
  marginBottomPx: z.number().openapi({ example: 24 }),
  shadow: z.string().optional().openapi({ example: '0 2px 4px rgba(0, 0, 0, 0.1)' }),
});

export class ResolvedBoxStyleDto extends createZodDto(ResolvedBoxStyleSchema) {}

export const SectionStylesSchema = z.object({
  container: ResolvedBoxStyleSchema,
  title: ResolvedTypographySchema,
  content: ResolvedTypographySchema,
});

export class SectionStylesDto extends createZodDto(SectionStylesSchema) {}

// ============================================================================
// Layout Types
// ============================================================================

export const ColumnDefinitionSchema = z.object({
  id: z.string().openapi({ example: 'col_main' }),
  widthPercentage: z.number().openapi({ example: 66.67 }),
  order: z.number().openapi({ example: 0 }),
});

export class ColumnDefinitionDto extends createZodDto(ColumnDefinitionSchema) {}

export const PageLayoutSchema = z.object({
  widthMm: z.number().describe('Page width in mm (A4 = 210)').openapi({ example: 210 }),
  heightMm: z.number().describe('Page height in mm (A4 = 297)').openapi({ example: 297 }),
  marginTopMm: z.number().openapi({ example: 20 }),
  marginBottomMm: z.number().openapi({ example: 20 }),
  marginLeftMm: z.number().openapi({ example: 15 }),
  marginRightMm: z.number().openapi({ example: 15 }),
  columns: z.array(ColumnDefinitionSchema),
  columnGapMm: z.number().openapi({ example: 10 }),
});

export class PageLayoutDto extends createZodDto(PageLayoutSchema) {}

export const GlobalStylesSchema = z.object({
  background: z.string().openapi({ example: '#ffffff' }),
  textPrimary: z.string().openapi({ example: '#1a1a1a' }),
  textSecondary: z.string().openapi({ example: '#666666' }),
  accent: z.string().openapi({ example: '#0066cc' }),
});

export class GlobalStylesDto extends createZodDto(GlobalStylesSchema) {}

export const AstMetaSchema = z.object({
  version: z.string().openapi({ example: '1.0.0' }),
  generatedAt: z.string().openapi({ example: '2026-02-15T12:00:00.000Z' }),
});

export class AstMetaDto extends createZodDto(AstMetaSchema) {}

// ============================================================================
// Placed Section (combines data + styles + position)
// ============================================================================

export const PlacedSectionSchema = z.object({
  sectionId: z.string().openapi({ example: 'sec_experience_1' }),
  columnId: z.string().openapi({ example: 'col_main' }),
  order: z.number().openapi({ example: 0 }),
  data: GenericSectionDataSchema.describe(
    'Generic section data. Structure is defined by sectionTypeKey and SectionType metadata.',
  ).openapi({
    example: {
      sectionTypeKey: 'section_type_v1',
      semanticKind: 'custom_section',
      title: 'Selected Highlights',
      items: [
        {
          id: 'item_1',
          order: 0,
          content: {
            headline: 'Senior Engineer',
            organization: 'Tech Corp',
            startedAt: '2020-01',
            isActive: true,
            highlights: ['Led team of 5'],
            tags: ['TypeScript'],
          },
        },
      ],
    },
  }),
  styles: SectionStylesSchema,
});

export class PlacedSectionDto extends createZodDto(PlacedSectionSchema) {}

// ============================================================================
// Resume AST (top-level structure)
// ============================================================================

export const ResumeAstSchema = z.object({
  meta: AstMetaSchema,
  page: PageLayoutSchema,
  sections: z.array(PlacedSectionSchema),
  globalStyles: GlobalStylesSchema,
});

export class ResumeAstDto extends createZodDto(ResumeAstSchema) {}

// ============================================================================
// Response DTOs for endpoints
// ============================================================================

export const DslAstResponseSchema = z.object({
  ast: ResumeAstSchema,
  resumeId: z.string().optional().openapi({ example: 'clxxx...' }),
  slug: z.string().optional().openapi({ example: 'john-doe-resume' }),
});

export class DslAstResponseDto extends createZodDto(DslAstResponseSchema) {}
