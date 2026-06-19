/**
 * Zod schemas for the external-jobs routes (JSearch daily batch). Lives
 * apart from `jobs.routes.schemas.ts` — that file is already at the
 * 300-line cap and this is a separate vertical.
 */

import { JobType, RemotePolicy } from '@prisma/client';
import { z } from 'zod';
import { PaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';
import { makePaginationSchema } from '@/shared-kernel/schemas/common/pagination.factory';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';
import { POSTED_WITHIN_VALUES } from './application/use-cases/list-external-jobs/list-external-jobs.use-case';

export const ExternalJobListSortFields = ['postedAt', 'fetchedAt'] as const;

/**
 * Multi-select query param encoded as CSV (`?workMode=REMOTE,HYBRID`).
 * Documented as a string in OpenAPI (zod-to-openapi renders the
 * pipeline's input side); runtime validation still rejects unknown
 * values with a 400. Also accepts an already-split array so the schema
 * is idempotent — the mounter parses `ctx.query` once and handlers
 * re-parse it by convention.
 */
function csvEnumParam<T extends Record<string, string>>(enumObject: T, example: string) {
  return z
    .union([z.string(), z.array(z.string())])
    .transform((value) =>
      (Array.isArray(value) ? value : value.split(',')).map((item) => item.trim()).filter(Boolean),
    )
    .pipe(z.array(z.nativeEnum(enumObject)).min(1))
    .optional()
    .openapi({
      type: 'string',
      example,
      description: 'Comma-separated list (any-of match).',
    });
}

export const ExternalJobListQuerySchema = makePaginationSchema(ExternalJobListSortFields).extend({
  q: z.string().max(200).optional(),
  workMode: csvEnumParam(RemotePolicy, 'REMOTE,HYBRID'),
  employmentType: csvEnumParam(JobType, 'FULL_TIME,CONTRACT'),
  postedWithin: z.enum(POSTED_WITHIN_VALUES).optional(),
});

export type ExternalJobListQuery = z.infer<typeof ExternalJobListQuerySchema>;

// `raw`, `dedupHash` and `sourceQuery` are deliberately not exposed —
// internal bookkeeping, not feed content.
export const ExternalJobItemSchema = z.object({
  id: z.string(),
  externalId: z.string().openapi({ example: 'BreJXMXqEoK60_-dAAAAAA==' }),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  isRemote: z.boolean().openapi({
    example: true,
    description: 'Raw upstream remote flag. Deprecated — read `workMode` instead.',
  }),
  workMode: z.nativeEnum(RemotePolicy).openapi({ example: 'REMOTE' }),
  employmentType: z.nativeEnum(JobType).nullable(),
  applyUrl: z.string(),
  publisher: z.string().nullable().openapi({ example: 'Indeed' }),
  description: z.string().nullable(),
  postedAt: IsoDateTimeSchema.nullable(),
  fetchedAt: IsoDateTimeSchema,
  isSaved: z.boolean(),
  savedId: z.string().nullable().openapi({
    description: 'Id of the caller’s saved row for this listing; null when not saved.',
  }),
});

export const ExternalJobsListResponseSchema = PaginatedResponseSchema(ExternalJobItemSchema);

// Saved rows render the same card shape; `savedAt` orders the list.
export const SavedExternalJobItemSchema = z.object({
  savedId: z.string(),
  savedAt: IsoDateTimeSchema,
  externalId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().nullable(),
  isRemote: z.boolean(),
  workMode: z.nativeEnum(RemotePolicy),
  employmentType: z.nativeEnum(JobType).nullable(),
  applyUrl: z.string(),
  publisher: z.string().nullable(),
  description: z.string().nullable(),
  postedAt: IsoDateTimeSchema.nullable(),
  fetchedAt: IsoDateTimeSchema,
  // Self-reported application state. null = never answered the
  // "você se candidatou?" prompt; true/false = the recorded answer.
  hasApplied: z.boolean().nullable().openapi({
    description: 'Self-reported "did you apply?" answer; null when never asked.',
  }),
  appliedAt: IsoDateTimeSchema.nullable().openapi({
    description: 'When the user confirmed they applied; null otherwise.',
  }),
});

export const SavedExternalJobsListResponseSchema = PaginatedResponseSchema(
  SavedExternalJobItemSchema,
);

// Body for POST /v1/jobs/external/saved/:id/did-apply — the client's answer
// to the "você se candidatou?" prompt shown on return from the apply site.
export const DidApplyExternalJobSchema = z.object({
  didApply: z.boolean().openapi({ example: true }),
});

export const DidApplyExternalJobResponseSchema = z.object({
  savedId: z.string(),
  hasApplied: z.boolean(),
  appliedAt: IsoDateTimeSchema.nullable(),
});

export const SaveExternalJobResponseSchema = z.object({
  savedId: z.string(),
  externalId: z.string(),
  alreadySaved: z.boolean(),
});

export const UnsaveExternalJobResponseSchema = z.object({
  savedId: z.string(),
  removed: z.literal(true),
});
