/**
 * Route descriptors for the resume-styles BC. Replaces
 * `ResumeStylesController` and `AdminResumeStylesController`, plus the
 * binary preview endpoint that previously lived in
 * `ResumeStylePreviewController` — the synthesizer now ships a
 * StreamableFile through unchanged thanks to its
 * `Res({ passthrough: true })` wiring.
 */

import { LayoutKind } from '@prisma/client';
import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const IdParams = IdParamSchema;
export const ResumeIdParams = z.object({ resumeId: z.string() });

export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
});

export const ApplyStyleBodySchema = z.object({ styleId: z.string() }).openapi({
  example: {
    styleId: '01900000-0000-7000-a000-000000000001',
  },
});

export const SectionStylesSchema = z.record(z.string(), z.unknown());

export const LayoutKindSchema = z.nativeEnum(LayoutKind);

export const CreateStyleBodySchema = z
  .object({
    name: z.string(),
    description: z.string().nullable().optional(),
    typstTemplate: z.string(),
    layoutKind: LayoutKindSchema,
    styleConfig: z.record(z.string(), z.unknown()),
    sectionStyles: SectionStylesSchema,
  })
  .openapi({
    example: {
      name: 'Modern Minimal',
      description: 'Clean single-column layout with generous whitespace.',
      typstTemplate: '#set page(margin: 1in)\n#text(weight: "bold")[Resume]',
      layoutKind: 'SINGLE_COLUMN',
      styleConfig: {
        fontFamily: 'Inter',
        accentColor: '#0ea5e9',
      },
      sectionStyles: {
        experience: { spacing: 1.2 },
      },
    },
  });

export const UpdateStyleBodySchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    typstTemplate: z.string().optional(),
    layoutKind: LayoutKindSchema.optional(),
    styleConfig: z.record(z.string(), z.unknown()).optional(),
    sectionStyles: SectionStylesSchema.optional(),
  })
  .openapi({
    example: {
      name: 'Modern Minimal v2',
      description: 'Updated layout with refined typography.',
    },
  });

// ─── Response schemas ─────────────────────────────────────────────────
// Bounded-depth JSON value: leaf | object | array. Two levels deep is
// enough for the style configuration shapes admins use today.
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
export const StyleConfigSchema = z.record(z.string(), z.unknown());

export const StyleSummaryResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  styleScore: z.number().int().min(0).max(100),
  layoutKind: LayoutKindSchema,
  typstTemplate: z.string(),
  isSystem: z.boolean(),
  thumbnailUrl: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const StyleDetailResponseSchema = StyleSummaryResponseSchema.extend({
  version: z.number().int(),
  styleConfig: StyleConfigSchema,
  sectionStyles: StyleConfigSchema,
  atsSafetyBreakdown: z.record(z.string(), z.number()),
  previewImages: z.array(z.string()),
  authorId: z.string(),
});

export const StyleListResponseSchema = z.object({
  items: z.array(StyleSummaryResponseSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const ApplyStyleResponseSchema = z.null();
export const DeleteStyleResponseSchema = z.null();
