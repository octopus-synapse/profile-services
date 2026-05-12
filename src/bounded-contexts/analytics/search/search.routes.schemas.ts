/**
 * Route descriptors for the resume-search submodule. Replaces
 * `SearchController`. The previous controller used a class-level
 * `@Throttle({ default: { limit: 30, ttl: 60_000 } })` override; the
 * synthesizer does not yet model per-route Throttle, so this route group
 * inherits the global throttler limits from `app.module.ts`. If the
 * stricter 30/min cap is needed it should be re-introduced via a
 * synthesizer extension or a sibling legacy controller.
 *
 * Bundle token is the existing `SearchServicePort`.
 */

import { z } from 'zod';
import { IdParamSchema } from '@/shared-kernel/schemas/params';
import { IsoDateTimeSchema } from '@/shared-kernel/schemas/primitives/datetime.schema';

export const SearchQuerySchema = z.object({
  q: z.string().max(500).optional(),
  skills: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  minExp: z.coerce.number().int().min(0).max(80).optional(),
  maxExp: z.coerce.number().int().min(0).max(80).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['relevance', 'date', 'views']).optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SuggestionsQuerySchema = z.object({
  prefix: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type SuggestionsQuery = z.infer<typeof SuggestionsQuerySchema>;

export const SimilarQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
});
export type SimilarQuery = z.infer<typeof SimilarQuerySchema>;

export const GlobalSearchQuerySchema = z
  .object({
    q: z.string().min(1).max(200),
    limit: z.coerce.number().int().min(1).max(20).default(5),
  })
  .openapi({ example: { q: 'react' } });
export type GlobalSearchQuery = z.infer<typeof GlobalSearchQuerySchema>;

export const IdParam = IdParamSchema;

export const GlobalSearchItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string().optional(),
  href: z.string(),
  badge: z.string().optional(),
});

export const GlobalSearchResponseSchema = z.object({
  groups: z.array(
    z.object({
      type: z.enum(['users', 'jobs', 'resumes', 'posts']),
      label: z.string(),
      items: z.array(GlobalSearchItemSchema),
    }),
  ),
});

export const SearchResultItemSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  fullName: z.string().nullable(),
  jobTitle: z.string().nullable(),
  summary: z.string().nullable(),
  slug: z.string().nullable(),
  location: z.string().nullable(),
  profileViews: z.number().int().min(0),
  createdAt: IsoDateTimeSchema,
  skills: z.array(z.string()).optional(),
  rank: z.number().optional(),
});

export const SearchResponseSchema = z.object({
  items: z.array(SearchResultItemSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export const SuggestionsResponseSchema = z.object({
  suggestions: z.array(z.string()),
});

export const SimilarResumesResponseSchema = z.object({
  resumes: z.array(SearchResultItemSchema),
});
