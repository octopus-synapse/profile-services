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

const GlobalSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});
type GlobalSearchQuery = z.infer<typeof GlobalSearchQuerySchema>;

const IdParam = z.object({ id: z.string() });

interface GlobalSearchItem {
  readonly id: string;
  readonly title: string;
  readonly snippet?: string;
  readonly href: string;
  readonly badge?: string;
}

interface GlobalSearchGroup {
  readonly type: 'users' | 'jobs' | 'resumes' | 'posts';
  readonly label: string;
  readonly items: readonly GlobalSearchItem[];
}

const GlobalSearchItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  snippet: z.string().optional(),
  href: z.string(),
  badge: z.string().optional(),
});

const GlobalSearchResponseSchema = z.object({
  groups: z.array(
    z.object({
      type: z.enum(['users', 'jobs', 'resumes', 'posts']),
      label: z.string(),
      items: z.array(GlobalSearchItemSchema),
    }),
  ),
});

export const searchRoutes: ReadonlyArray<Route<SearchServicePort>> = [
  {
    method: 'GET',
    path: '/v1/search',
    auth: { kind: 'public' },
    query: SearchQuerySchema as unknown as Route<SearchServicePort>['query'],
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
      return result;
    },
  },
  {
    method: 'GET',
    path: '/v1/search/suggestions',
    auth: { kind: 'public' },
    query: SuggestionsQuerySchema as unknown as Route<SearchServicePort>['query'],
    openapi: {
      summary: 'Get search autocomplete suggestions',
      tags: ['search'],
      description: 'Resume Search API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const q = ctx.query as unknown as SuggestionsQuery;
      const suggestions = await service.suggest(q.prefix || '', q.limit);
      return { suggestions };
    },
  },
  {
    method: 'GET',
    path: '/v1/search/global',
    auth: { kind: 'public' },
    query: GlobalSearchQuerySchema as unknown as Route<SearchServicePort>['query'],
    response: GlobalSearchResponseSchema,
    openapi: {
      summary: 'Global multi-type search (resumes, users, jobs, posts)',
      tags: ['search'],
      description:
        'Returns results grouped by entity type. Each item carries `{id,title,snippet?,href,badge?}` so the frontend can render a generic list. Today only the `resumes` group is populated; `users`, `jobs`, `posts` groups stream in once their dedicated indexes are wired.',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const q = ctx.query as unknown as GlobalSearchQuery;
      const resumeResult = await service.search({
        query: q.q,
        skills: [],
        page: 1,
        limit: q.limit,
      });
      // The resume-search service still returns the legacy `{data, ...}`
      // shape; we adapt here so the global-search wire format stays canonical.
      const rows =
        (resumeResult as unknown as { data?: ReadonlyArray<Record<string, unknown>> }).data ?? [];
      const resumeItems: GlobalSearchItem[] = rows.map((row) => ({
        id: String(row.id ?? ''),
        title: String(row.fullName ?? row.jobTitle ?? 'Untitled'),
        snippet:
          typeof row.summary === 'string' && row.summary.length > 0
            ? row.summary.slice(0, 160)
            : undefined,
        href: `/resumes/${String(row.slug ?? row.id ?? '')}`,
      }));
      const groups: GlobalSearchGroup[] = [
        { type: 'resumes', label: 'Currículos', items: resumeItems },
        // TODO: populate users/jobs/posts groups once their indexes ship.
      ];
      return { groups };
    },
  },
  {
    method: 'GET',
    path: '/v1/search/similar/:id',
    auth: { kind: 'public' },
    params: IdParam,
    query: SimilarQuerySchema as unknown as Route<SearchServicePort>['query'],
    openapi: {
      summary: 'Find similar resumes by resume id',
      tags: ['search'],
      description: 'Resume Search API',
    },
    sdk: { exported: true },
    handler: async (ctx, service) => {
      const { id } = ctx.params as { id: string };
      const q = ctx.query as unknown as SimilarQuery;
      const resumes = await service.findSimilar(id, q.limit);
      return { resumes };
    },
  },
];
