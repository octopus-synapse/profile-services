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
import type { Route } from '@/shared-kernel/http/route';
import { SearchServicePort } from './ports';
import { parseCsvQuery } from './search.presenter';

const SearchQuerySchema = z.object({
  q: z.string().max(500).optional(),
  skills: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  minExp: z.coerce.number().int().min(0).max(80).optional(),
  maxExp: z.coerce.number().int().min(0).max(80).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['relevance', 'date', 'views']).optional(),
});
type SearchQuery = z.infer<typeof SearchQuerySchema>;

const SuggestionsQuerySchema = z.object({
  prefix: z.string().max(50).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
type SuggestionsQuery = z.infer<typeof SuggestionsQuerySchema>;

const SimilarQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
});
type SimilarQuery = z.infer<typeof SimilarQuerySchema>;

const IdParam = z.object({ id: z.string() });

export const searchRoutes: ReadonlyArray<Route<SearchServicePort>> = [
  {
    method: 'GET',
    path: '/search',
    auth: { kind: 'public' },
    query: SearchQuerySchema as unknown as z.ZodType<SearchQuery>,
    openapi: {
      summary: 'Search public resumes',
      tags: ['search'],
      description: 'Resume Search API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const q = ctx.query as unknown as SearchQuery;
      const result = await service.search({
        query: q.q || '',
        skills: parseCsvQuery(q.skills),
        location: q.location,
        minExperienceYears: q.minExp,
        maxExperienceYears: q.maxExp,
        page: q.page,
        limit: q.limit,
        sortBy: q.sortBy,
      });
      return { success: true, data: result };
    },
  },
  {
    method: 'GET',
    path: '/search/suggestions',
    auth: { kind: 'public' },
    query: SuggestionsQuerySchema as unknown as z.ZodType<SuggestionsQuery>,
    openapi: {
      summary: 'Get search autocomplete suggestions',
      tags: ['search'],
      description: 'Resume Search API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const q = ctx.query as unknown as SuggestionsQuery;
      const suggestions = await service.suggest(q.prefix || '', q.limit);
      return { success: true, data: { suggestions } };
    },
  },
  {
    method: 'GET',
    path: '/search/similar/:id',
    auth: { kind: 'public' },
    params: IdParam,
    query: SimilarQuerySchema,
    openapi: {
      summary: 'Find similar resumes by resume id',
      tags: ['search'],
      description: 'Resume Search API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { id } = ctx.params as { id: string };
      const q = ctx.query as z.infer<typeof SimilarQuerySchema>;
      const resumes = await service.findSimilar(id, q.limit);
      return { success: true, data: { resumes } };
    },
  },
];
