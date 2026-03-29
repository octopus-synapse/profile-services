/**
 * Section Type Response DTOs
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ============================================================================
// Schemas
// ============================================================================

const SectionTypeDataSchema = z.object({
  id: z.string(),
  key: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  semanticKind: z.string(),
  version: z.number().int(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  isRepeatable: z.boolean(),
  minItems: z.number().int(),
  maxItems: z.number().int().nullable().optional(),
  definition: z.record(z.unknown()),
  uiSchema: z.record(z.unknown()).nullable().optional(),
  renderHints: z.record(z.unknown()),
  fieldStyles: z.record(z.record(z.unknown())),
  iconType: z.string(),
  icon: z.string(),
  translations: z.record(z.record(z.string())),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const SectionTypeListDataSchema = z.object({
  items: z.array(SectionTypeDataSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

const SemanticKindsDataSchema = z.object({
  kinds: z.array(z.string()),
});

// ============================================================================
// DTOs
// ============================================================================

export class SectionTypeDataDto extends createZodDto(SectionTypeDataSchema) {}
export class SectionTypeListDataDto extends createZodDto(SectionTypeListDataSchema) {}
export class SemanticKindsDataDto extends createZodDto(SemanticKindsDataSchema) {}
