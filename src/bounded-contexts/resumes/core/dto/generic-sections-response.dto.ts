/**
 * Generic Sections Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const ResolvedSectionTypeSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string(),
  semanticKind: z.string(),
  version: z.number().int(),
  title: z.string(),
  description: z.string(),
  label: z.string(),
  noDataLabel: z.string(),
  placeholder: z.string(),
  addLabel: z.string(),
  iconType: z.string(),
  icon: z.string(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  isRepeatable: z.boolean(),
  minItems: z.number().int().nullable(),
  maxItems: z.number().int().nullable(),
  definition: z.unknown(),
  uiSchema: z.unknown().nullable(),
  renderHints: z.unknown(),
  fieldStyles: z.unknown(),
});

const ResumeSectionTypesDataSchema = z.object({
  sectionTypes: z.array(ResolvedSectionTypeSchema),
});

const GenericSectionItemSchema = z.object({
  id: z.string(),
  resumeSectionId: z.string(),
  content: z.unknown(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const GenericSectionTypeRefSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  semanticKind: z.string(),
  version: z.number().int(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  isRepeatable: z.boolean(),
  minItems: z.number().int(),
  maxItems: z.number().int().nullable(),
  definition: z.unknown(),
  uiSchema: z.unknown().nullable(),
  renderHints: z.unknown(),
  fieldStyles: z.unknown(),
  iconType: z.string(),
  icon: z.string(),
  translations: z.unknown(),
  examples: z.unknown(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const GenericResumeSectionSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  sectionTypeId: z.string(),
  titleOverride: z.string().nullable(),
  isVisible: z.boolean(),
  order: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
  sectionType: GenericSectionTypeRefSchema.nullable(),
  items: z.array(GenericSectionItemSchema),
});

const ResumeSectionsDataSchema = z.object({
  sections: z.array(GenericResumeSectionSchema),
});

const ResumeSectionItemDataSchema = z.object({
  item: GenericSectionItemSchema,
});

const ResumeSectionDeleteDataSchema = z.object({
  deleted: z.boolean(),
});

// ============================================================================
// DTOs
// ============================================================================

export class ResolvedSectionTypeDto extends createZodDto(ResolvedSectionTypeSchema) {}
export class ResumeSectionTypesDataDto extends createZodDto(ResumeSectionTypesDataSchema) {}
export class GenericSectionItemDto extends createZodDto(GenericSectionItemSchema) {}
export class GenericResumeSectionDto extends createZodDto(GenericResumeSectionSchema) {}
export class ResumeSectionsDataDto extends createZodDto(ResumeSectionsDataSchema) {}
export class ResumeSectionItemDataDto extends createZodDto(ResumeSectionItemDataSchema) {}
export class ResumeSectionDeleteDataDto extends createZodDto(ResumeSectionDeleteDataSchema) {}
