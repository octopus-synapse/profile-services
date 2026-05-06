/**
 * Response DTOs for the resume-tailor controller. Annotated with
 * `createZodDto` so Nest Swagger emits a proper schema and Orval
 * generates typed client methods — the UI previously saw `void` for
 * every 2xx because no DTO was registered.
 */

import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

// ---------- shared ----------

const BulletDiffSchema = z.object({
  id: z.string(),
  original: z.string(),
  tailored: z.string(),
  highlights: z.array(z.string()),
});

// ---------- POST /v1/resumes/:id/tailor ----------

const TailorResumeDataSchema = z.object({
  versionId: z.string(),
  versionNumber: z.number().int(),
  label: z.string(),
  summary: z.string().nullable(),
  jobTitle: z.string().nullable(),
  bullets: z.array(BulletDiffSchema),
});

export class TailorResumeDataDto extends createZodDto(TailorResumeDataSchema) {}

// ---------- GET /v1/resumes/:id/tailored-versions ----------

const TailoredVersionSummarySchema = z.object({
  id: z.string(),
  versionNumber: z.number().int(),
  label: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  tailoredJobId: z.string().nullable(),
});

const TailoredVersionsListDataSchema = z.object({
  versions: z.array(TailoredVersionSummarySchema),
});

export class TailoredVersionsListDataDto extends createZodDto(TailoredVersionsListDataSchema) {}

// ---------- GET /v1/resumes/:id/diff ----------

const BeforeAfterStringSchema = z.object({
  before: z.string().nullable(),
  after: z.string().nullable(),
});

const BulletBeforeAfterSchema = z.object({
  id: z.string(),
  before: z.string(),
  after: z.string(),
  highlights: z.array(z.string()),
});

const TailoredVersionDiffDataSchema = z.object({
  versionId: z.string(),
  summary: BeforeAfterStringSchema.nullable(),
  jobTitle: BeforeAfterStringSchema.nullable(),
  bullets: z.array(BulletBeforeAfterSchema),
});

export class TailoredVersionDiffDataDto extends createZodDto(TailoredVersionDiffDataSchema) {}
