/**
 * Search Routes Tests
 *
 * Pure tests of the route descriptors using in-memory service implementations.
 * The routes' handlers receive `(ctx, bundle)` and return `HandlerResult`.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route';
import type { SearchServicePort } from './ports';
import { searchRoutes } from './search.routes';
import { InMemorySearchService } from './testing';

function findRoute(method: string, path: string): Route<SearchServicePort> {
  const r = searchRoutes.find((rt) => rt.method === method && rt.path === path);
  if (!r) throw new Error(`Route not found: ${method} ${path}`);
  return r as Route<SearchServicePort>;
}

function makeCtx(partial: {
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, string>;
}): HttpCtx {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    body: partial.body ?? {},
    query: (partial.query ?? {}) as HttpCtx['query'],
    params: (partial.params ?? {}) as HttpCtx['params'],
    user: null,
    state: {},
  };
}

describe('SearchRoutes', () => {
  let searchService: InMemorySearchService;

  beforeEach(() => {
    searchService = new InMemorySearchService();

    searchService.seedResume({
      id: 'resume-1',
      userId: 'user-1',
      fullName: 'John Doe',
      jobTitle: 'Senior Developer',
      summary: 'Experienced developer',
      slug: 'john-doe',
      location: 'São Paulo',
      profileViews: 100,
      skills: ['TypeScript', 'React'],
    });

    searchService.seedResume({
      id: 'resume-2',
      userId: 'user-2',
      fullName: 'Jane Smith',
      jobTitle: 'Developer',
      summary: 'Junior developer',
      slug: 'jane-smith',
      location: 'Rio de Janeiro',
      profileViews: 50,
      skills: ['JavaScript', 'React'],
    });

    searchService.seedSuggestions(['developer', 'designer', 'devops']);
  });

  describe('GET /search', () => {
    const route = () => findRoute('GET', '/search');

    it('should search resumes with query', async () => {
      const r = route();
      const parsed = r.query!.parse({ q: 'developer', page: 1, limit: 20 });
      const result = (await r.handler(makeCtx({ query: parsed }), searchService)) as {
        success: boolean;
        data: { data: unknown[] };
      };

      expect(result.success).toBe(true);
      expect(result.data.data.length).toBeGreaterThan(0);
    });

    it('should parse skills from comma-separated string', async () => {
      const r = route();
      const parsed = r.query!.parse({ q: '', skills: 'react, typescript', page: 1, limit: 20 });
      const result = (await r.handler(makeCtx({ query: parsed }), searchService)) as {
        data: { data: unknown[] };
      };

      expect(result.data.data).toHaveLength(2);
    });

    it('should parse pagination params', async () => {
      const r = route();
      const parsed = r.query!.parse({ q: '', page: 1, limit: 1 });
      const result = (await r.handler(makeCtx({ query: parsed }), searchService)) as {
        data: { data: unknown[]; page: number; limit: number };
      };

      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(1);
      expect(result.data.data).toHaveLength(1);
    });

    it('should filter by location', async () => {
      const r = route();
      const parsed = r.query!.parse({ q: '', location: 'São Paulo', page: 1, limit: 20 });
      const result = (await r.handler(makeCtx({ query: parsed }), searchService)) as {
        data: { data: { fullName: string }[] };
      };

      expect(result.data.data).toHaveLength(1);
      expect(result.data.data[0].fullName).toBe('John Doe');
    });
  });

  describe('GET /search/suggestions', () => {
    const route = () => findRoute('GET', '/search/suggestions');

    it('should return suggestions for prefix', async () => {
      const r = route();
      const parsed = r.query!.parse({ prefix: 'dev', limit: 10 });
      const result = (await r.handler(makeCtx({ query: parsed }), searchService)) as {
        success: boolean;
        data: { suggestions: string[] };
      };

      expect(result.success).toBe(true);
      expect(result.data.suggestions).toContain('developer');
      expect(result.data.suggestions).toContain('devops');
    });

    it('should respect limit parameter', async () => {
      const r = route();
      const parsed = r.query!.parse({ prefix: 'dev', limit: 1 });
      const result = (await r.handler(makeCtx({ query: parsed }), searchService)) as {
        data: { suggestions: string[] };
      };

      expect(result.data.suggestions).toHaveLength(1);
    });
  });

  describe('GET /search/similar/:id', () => {
    const route = () => findRoute('GET', '/search/similar/:id');

    it('should find similar resumes', async () => {
      const r = route();
      const parsed = r.query!.parse({ limit: 5 });
      const result = (await r.handler(
        makeCtx({ query: parsed, params: { id: 'resume-1' } }),
        searchService,
      )) as { success: boolean; data: { resumes: { id: string }[] } };

      expect(result.success).toBe(true);
      expect(result.data.resumes.some((r2) => r2.id === 'resume-2')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      searchService.seedResume({
        id: 'resume-3',
        fullName: 'Bob',
        skills: ['TypeScript', 'React', 'Node.js'],
      });

      const r = route();
      const parsed = r.query!.parse({ limit: 1 });
      const result = (await r.handler(
        makeCtx({ query: parsed, params: { id: 'resume-1' } }),
        searchService,
      )) as { data: { resumes: unknown[] } };

      expect(result.data.resumes).toHaveLength(1);
    });
  });
});
