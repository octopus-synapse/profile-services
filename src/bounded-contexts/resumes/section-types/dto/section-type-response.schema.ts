import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

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
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

const SectionTypeListDataSchema = z.object({
  items: z.array(SectionTypeDataSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

const SemanticKindsDataSchema = z.object({ kinds: z.array(z.string()) });

// ============================================================================
// DTOs
// ============================================================================

export type SectionTypeDataDto = z.infer<typeof SectionTypeDataSchema>;

export type SectionTypeListDataDto = z.infer<typeof SectionTypeListDataSchema>;

export type SemanticKindsDataDto = z.infer<typeof SemanticKindsDataSchema>;
