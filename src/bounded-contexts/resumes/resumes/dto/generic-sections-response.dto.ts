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
  definition: z.record(z.unknown()),
  uiSchema: z.record(z.unknown()).nullable(),
  renderHints: z.record(z.unknown()),
  fieldStyles: z.record(z.unknown()),
});

const ResumeSectionTypesDataSchema = z.object({
  sectionTypes: z.array(ResolvedSectionTypeSchema),
});

const ResumeSectionsDataSchema = z.object({
  sections: z.array(z.record(z.unknown())),
});

const ResumeSectionItemDataSchema = z.object({
  item: z.record(z.unknown()),
});

const ResumeSectionDeleteDataSchema = z.object({
  deleted: z.boolean(),
});

// ============================================================================
// DTOs
// ============================================================================

export class ResolvedSectionTypeDto extends createZodDto(ResolvedSectionTypeSchema) {}
export class ResumeSectionTypesDataDto extends createZodDto(ResumeSectionTypesDataSchema) {}
export class ResumeSectionsDataDto extends createZodDto(ResumeSectionsDataSchema) {}
export class ResumeSectionItemDataDto extends createZodDto(ResumeSectionItemDataSchema) {}
export class ResumeSectionDeleteDataDto extends createZodDto(ResumeSectionDeleteDataSchema) {}
