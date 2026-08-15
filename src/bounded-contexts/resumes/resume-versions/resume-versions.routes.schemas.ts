/**
 * Route descriptors for the resume-versions BC. Replaces the read-only
 * version endpoints in `ResumeVersionController` and the entire
 * `ResumeTailorController` — including `POST .../tailor`. The
 * `RequireFitProfileGuard` + `RequireMinQualityGuard` chain is wired
 * via the synthesizer guard registry under ids `fit-profile` and
 * `min-quality`. The min-quality metadata (threshold + resume-param
 * name) travels as `route.guards[*].metadata` and is honored by the
 * bootstrap's gate check (see `resolveMinQualityTarget`).
 */

import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const ResumeIdParam = z.object({ resumeId: z.string().uuid() });
export const ResumeIdAndVersionIdParam = z.object({
  resumeId: z.string().uuid(),
  versionId: z.string().uuid(),
});

export const VersionIdQuery = z
  .object({ versionId: z.string().uuid() })
  .openapi({ example: { versionId: '01900000-0000-7000-a000-000000000001' } });

export const TailorResumeBody = z
  .object({
    jobId: z.string().uuid().min(1).optional().openapi({
      description:
        'Target job id — resolves against internal jobs first, then the external-listings mirror (JSearch).',
    }),
    jobDescription: z.string().min(10).optional(),
    jobTitle: z.string().max(200).optional(),
    jobCompany: z.string().max(200).optional(),
  })
  .openapi({
    example: {
      jobTitle: 'Senior Backend Engineer',
      jobCompany: 'Acme Corp',
      jobDescription:
        'We are hiring a backend engineer to design distributed systems on AWS using TypeScript and PostgreSQL.',
    },
  });

// ─── Response schemas ─────────────────────────────────────────────────
export const ResumeVersionListItemSchema = z.object({
  id: z.string(),
  versionNumber: z.number().int(),
  label: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
});

export const ResumeVersionsResponseSchema = z.object({
  versions: z.array(ResumeVersionListItemSchema),
});

export const TailoredVersionSummarySchema = ResumeVersionListItemSchema.extend({
  tailoredJobId: z.string().uuid().nullable(),
  tailoredJobTitle: z.string().nullable().openapi({
    description: 'Title of the job this variant was tailored for (null if the job was deleted).',
    example: 'Senior Backend Engineer',
  }),
  tailoredJobCompany: z.string().nullable().openapi({
    description: 'Company of the job this variant was tailored for (null if the job was deleted).',
    example: 'Acme Corp',
  }),
});

export const TailoredVersionsResponseSchema = z.object({
  versions: z.array(TailoredVersionSummarySchema),
});

export const ResumeVersionRestoreResponseSchema = z.object({
  restoredFrom: IsoDateTimeSchema,
});

export const ResumeVersionDetailSchema = ResumeVersionListItemSchema.extend({
  resumeId: z.string().uuid().optional(),
});

export const ResumeVersionResponseSchema = z.object({
  version: ResumeVersionDetailSchema,
});

export const TailorBulletSchema = z.object({
  id: z.string(),
  original: z.string(),
  tailored: z.string(),
  highlights: z.array(z.string()),
});

export const TailoredVersionDiffResponseSchema = z.object({
  versionId: z.string().uuid(),
  summary: z.object({ before: z.string().nullable(), after: z.string().nullable() }).nullable(),
  jobTitle: z.object({ before: z.string().nullable(), after: z.string().nullable() }).nullable(),
  bullets: z.array(
    z.object({
      id: z.string(),
      before: z.string(),
      after: z.string(),
      highlights: z.array(z.string()),
    }),
  ),
});

export const TailorChangeSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  op: z.enum(['add', 'remove', 'replace']),
  before: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  after: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  highlights: z.array(z.string()).optional(),
});

// Compatibility before/after the tailoring, present when `jobId` resolved
// (internal or external). `after` re-derives only the keyword signal from
// the keywords the tailoring actually injected — conservative, never
// fabricated; `estimated` flags the semantics for the client.
export const TailorMatchEstimateSchema = z.object({
  before: z.number().int().min(0).max(100),
  after: z.number().int().min(0).max(100),
  estimated: z.literal(true),
});

export const TailorResumeResponseSchema = z.object({
  versionId: z.string().uuid(),
  versionNumber: z.number().int(),
  label: z.string(),
  summary: z.string().nullable(),
  jobTitle: z.string().nullable(),
  bullets: z.array(TailorBulletSchema),
  changes: z.array(TailorChangeSchema),
  match: TailorMatchEstimateSchema.nullable(),
});
