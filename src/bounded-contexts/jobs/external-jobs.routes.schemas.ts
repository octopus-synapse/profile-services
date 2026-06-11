/**
 * Zod schemas for the external-jobs routes (JSearch daily batch). Lives
 * apart from `jobs.routes.schemas.ts` — that file is already at the
 * 300-line cap and this is a separate vertical.
 */

import { JobType } from '@prisma/client';
import { z } from 'zod';
import { PaginatedResponseSchema } from '@/shared-kernel/schemas/common/api.types';
import { makePaginationSchema } from '@/shared-kernel/schemas/common/pagination.factory';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const ExternalJobListSortFields = ['postedAt', 'fetchedAt'] as const;

export const ExternalJobListQuerySchema = makePaginationSchema(ExternalJobListSortFields).extend({
  q: z.string().max(200).optional(),
  // String enum (not z.coerce.boolean(): that maps "false" → true).
  // The route handler converts to a real boolean.
  isRemote: z.enum(['true', 'false']).optional(),
  employmentType: z.nativeEnum(JobType).optional(),
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
  isRemote: z.boolean().openapi({ example: true }),
  employmentType: z.nativeEnum(JobType).nullable(),
  applyUrl: z.string(),
  publisher: z.string().nullable().openapi({ example: 'Indeed' }),
  description: z.string().nullable(),
  postedAt: IsoDateTimeSchema.nullable(),
  fetchedAt: IsoDateTimeSchema,
});

export const ExternalJobsListResponseSchema = PaginatedResponseSchema(ExternalJobItemSchema);
