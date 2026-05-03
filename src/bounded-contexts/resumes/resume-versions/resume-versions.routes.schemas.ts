/**
 * Route descriptors for the resume-versions BC. Replaces the read-only
 * version endpoints in `ResumeVersionController` and the entire
 * `ResumeTailorController` — including `POST .../tailor`. The
 * `RequireFitProfileGuard` + `RequireMinQualityGuard` chain is wired
 * via the synthesizer guard registry under ids `fit-profile` and
 * `min-quality`. The min-quality metadata (threshold + resume-param
 * name) is forwarded as `route.guards[*].metadata` and mapped to the
 * Reflector keys the guard reads.
 */

import { z } from 'zod';

export const ResumeIdParam = z.object({ resumeId: z.string() });
export const ResumeIdAndVersionIdParam = z.object({
  resumeId: z.string(),
  versionId: z.string(),
});

export const VersionIdQuery = z.object({ versionId: z.string() });

export const TailorResumeBody = z.object({
  jobId: z.string().min(1).optional(),
  jobDescription: z.string().min(10).optional(),
  jobTitle: z.string().max(200).optional(),
  jobCompany: z.string().max(200).optional(),
});

// ─── Response schemas ─────────────────────────────────────────────────
export const ResumeVersionListItemSchema = z.object({
  id: z.string(),
  versionNumber: z.number().int(),
  label: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export const ResumeVersionsResponseSchema = z.object({
  versions: z.array(ResumeVersionListItemSchema),
});

export const TailoredVersionSummarySchema = ResumeVersionListItemSchema.extend({
  tailoredJobId: z.string().nullable(),
});

export const TailoredVersionsResponseSchema = z.object({
  versions: z.array(TailoredVersionSummarySchema),
});

export const ResumeVersionRestoreResponseSchema = z.object({
  restoredFrom: z.string().datetime(),
});

export const ResumeVersionDetailSchema = ResumeVersionListItemSchema.extend({
  resumeId: z.string().optional(),
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
  versionId: z.string(),
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

export const TailorResumeResponseSchema = z.object({
  versionId: z.string(),
  versionNumber: z.number().int(),
  label: z.string(),
  summary: z.string().nullable(),
  jobTitle: z.string().nullable(),
  bullets: z.array(TailorBulletSchema),
  changes: z.array(TailorChangeSchema),
});
