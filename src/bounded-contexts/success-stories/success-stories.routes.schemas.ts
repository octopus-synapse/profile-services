/**
 * Route descriptors for the success-stories BC. Replaces
 * `SuccessStoryController`.
 */

import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const IdParam = IdParamSchema;
export const LimitQuery = z.object({ limit: z.string().optional() });

// ─── Response schemas ─────────────────────────────────────────────────
export const SuccessStoryAuthorSchema = z.object({
  name: z.string().nullable(),
  username: z.string().nullable(),
  photoURL: z.string().nullable(),
});

export const SuccessStorySchema = z.object({
  id: z.string(),
  userId: z.string(),
  headline: z.string(),
  beforeText: z.string(),
  afterText: z.string(),
  quote: z.string(),
  timeframeDays: z.number().int().nullable(),
  publishedAt: IsoDateTimeSchema.nullable(),
  user: SuccessStoryAuthorSchema,
});

export const SuccessStoriesListResponseSchema = z.object({
  stories: z.array(SuccessStorySchema),
});

export const SuccessStoryIdResponseSchema = IdParamSchema;
