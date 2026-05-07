/**
 * Route descriptors for the admin-section-types BC. Replaces
 * `AdminSectionTypesController`. Wires Zod validation directly on
 * body/query schemas.
 */

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

extendZodWithOpenApi(z);

export const KeyParam = z.object({ key: z.string() });

// ─── Response schemas ─────────────────────────────────────────────────
// Bounded-depth JSON value: leaf | array of leaves | object of leaves.
// Two levels deep covers the section type definition / uiSchema / hints
// shapes that admins use today.
export const JsonLeafSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const JsonNodeLevel2Schema = z.union([
  JsonLeafSchema,
  z.array(JsonLeafSchema),
  z.record(z.string(), JsonLeafSchema),
]);
export const JsonNodeLevel1Schema = z.union([
  JsonLeafSchema,
  z.array(JsonNodeLevel2Schema),
  z.record(z.string(), JsonNodeLevel2Schema),
]);
export const JsonObjectSchema = z
  .record(z.string(), z.unknown())
  .openapi({ example: { fields: [], translations: {} } });

export const SectionTypeTranslationSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  label: z.string(),
  noDataLabel: z.string().optional(),
  placeholder: z.string().optional(),
  addLabel: z.string().optional(),
  fieldLabels: z.record(z.string(), z.string()).optional(),
});

export const SectionTypeResponseSchema = z.object({
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
  definition: JsonObjectSchema,
  uiSchema: JsonObjectSchema.nullable(),
  renderHints: JsonObjectSchema,
  fieldStyles: z.record(z.string(), JsonObjectSchema),
  iconType: z.string(),
  icon: z.string(),
  translations: z.record(z.string(), SectionTypeTranslationSchema),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const SectionTypeListResponseSchema = z.object({
  items: z.array(SectionTypeResponseSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export const SemanticKindsResponseSchema = z
  .array(z.string().openapi({ example: 'work_experience' }))
  .openapi({ example: ['work_experience', 'education', 'skills'] });
