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
import { ScoreRankSchema } from '@/shared-kernel/scoring/rank';

export const IdParams = IdParamSchema;
export const ResumeIdParams = z.object({ resumeId: z.string().uuid() });

export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
});

export const ApplyStyleBodySchema = z.object({ styleId: z.string().uuid() }).openapi({
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
      // A full DSL config, not a sketch: `styleScore` is recomputed from this
      // by the ATS rubric and a create below STYLE_SCORE_MIN (80) is rejected
      // with 422. The old example predated the DSL entirely
      // (`{ fontFamily, accentColor }`), so it scored ~0 and the documented
      // example could not have worked. Mirrors the seeded ATS Classic style.
      styleConfig: {
        version: '1.0.0',
        layout: {
          type: 'single-column',
          paperSize: 'a4',
          margins: 'normal',
          pageBreakBehavior: 'auto',
        },
        tokens: {
          typography: {
            fontFamily: { heading: 'calibri', body: 'calibri' },
            fontSize: 'base',
            headingStyle: 'bold',
          },
          colors: {
            colors: {
              primary: '#111111',
              secondary: '#444444',
              background: '#FFFFFF',
              surface: '#F9FAFB',
              text: { primary: '#1A1A1A', secondary: '#444444', accent: '#222222' },
              border: '#CCCCCC',
              divider: '#E5E7EB',
            },
            borderRadius: 'sm',
            shadows: 'none',
          },
          spacing: {
            density: 'comfortable',
            sectionGap: 'md',
            itemGap: 'md',
            contentPadding: 'md',
          },
        },
        sections: [],
      },
      sectionStyles: {},
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
  /** Letter grade for `styleScore` (S/A/B/C/D/F), from the shared ladder. */
  styleRank: ScoreRankSchema,
  layoutKind: LayoutKindSchema,
  typstTemplate: z.string(),
  isSystem: z.boolean(),
  thumbnailUrl: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export const StyleScoreIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  bucket: z.string(),
  messageArgs: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export const StyleScoreBreakdownSchema = z.object({
  buckets: z.record(z.string(), z.number()),
  issues: z.array(StyleScoreIssueSchema),
});

export const StyleDetailResponseSchema = StyleSummaryResponseSchema.extend({
  version: z.number().int(),
  styleConfig: StyleConfigSchema,
  sectionStyles: StyleConfigSchema,
  styleScoreBreakdown: StyleScoreBreakdownSchema,
  previewImages: z.array(z.string()),
  authorId: z.string().uuid(),
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

/**
 * Presenter-facing types. These live with the ROUTE schemas on purpose: a
 * parallel copy under `infrastructure/dto/` drifted apart from these and
 * gained `styleRank` while the contract did not, so the API returned a field
 * its own schema rejected. One definition, one contract.
 */
export type StyleSummaryDto = z.infer<typeof StyleSummaryResponseSchema>;
export type StyleDetailDto = z.infer<typeof StyleDetailResponseSchema>;
export type StyleListResponseDto = z.infer<typeof StyleListResponseSchema>;

export const ApplyStyleResponseSchema = z.null();
export const DeleteStyleResponseSchema = z.null();
