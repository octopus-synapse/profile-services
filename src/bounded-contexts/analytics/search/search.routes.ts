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

import type { Route } from '@/shared-kernel/http/route.types';
import { SearchServicePort } from './ports';
import { parseCsvQuery } from './search.presenter';
import {
  GlobalSearchQuerySchema,
  GlobalSearchResponseSchema,
  IdParam,
  SearchQuerySchema,
  SearchResponseSchema,
  SimilarQuerySchema,
  SimilarResumesResponseSchema,
  SuggestionsQuerySchema,
  SuggestionsResponseSchema,
} from './search.routes.schemas';

export const searchRoutes: ReadonlyArray<Route<SearchServicePort>> = [
  {
    method: 'GET',
    path: '/v1/search',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=30' },
    query: SearchQuerySchema,
    response: SearchResponseSchema,
    openapi: {
      summary: 'Search public resumes',
      tags: ['search'],
      description: 'Resume Search API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const q = SearchQuerySchema.parse(ctx.query);
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
      return result;
    },
  },
  {
    method: 'GET',
    path: '/v1/search/suggestions',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=30' },
    query: SuggestionsQuerySchema,
    response: SuggestionsResponseSchema,
    openapi: {
      summary: 'Get search autocomplete suggestions',
      tags: ['search'],
      description: 'Resume Search API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const q = SuggestionsQuerySchema.parse(ctx.query);
      const suggestions = await service.suggest(q.prefix || '', q.limit);
      return { suggestions };
    },
  },
  {
    method: 'GET',
    path: '/v1/search/global',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=30' },
    query: GlobalSearchQuerySchema,
    response: GlobalSearchResponseSchema,
    openapi: {
      summary: 'Global multi-type search (resumes, users, jobs, posts)',
      tags: ['search'],
      description:
        'Returns results grouped by entity type. Each item carries `{id,title,snippet?,href,badge?}` so the frontend can render a generic list. Groups: `resumes`, `users`, `jobs`, `posts`.',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const q = GlobalSearchQuerySchema.parse(ctx.query);
      return service.globalSearch(q.q, q.limit);
    },
  },
  {
    method: 'GET',
    path: '/v1/search/similar/:id',
    auth: { kind: 'public' },
    headers: { 'Cache-Control': 'public, max-age=30' },
    params: IdParam,
    query: SimilarQuerySchema,
    response: SimilarResumesResponseSchema,
    openapi: {
      summary: 'Find similar resumes by resume id',
      tags: ['search'],
      description: 'Resume Search API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { id } = ctx.params as { id: string };
      const q = SimilarQuerySchema.parse(ctx.query);
      const resumes = await service.findSimilar(id, q.limit);
      return { resumes };
    },
  },
];
