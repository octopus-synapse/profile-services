/**
 * DSL Routes Unit Tests
 *
 * Each handler is a wire over a use case; we mock the use cases bundle
 * and assert handlers hand inputs through and wrap the result in the
 * canonical envelope.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route';
import type { DslUseCases } from './application/ports/dsl.port';
import { dslRoutes } from './dsl.routes';

function makeCtx(overrides: Partial<HttpCtx> = {}): HttpCtx {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    cookies: {},
    ip: undefined,
    userAgent: undefined,
    body: undefined,
    query: {},
    params: {},
    user: null,
    state: {},
    ...overrides,
  };
}

function findRoute(method: string, path: string): Route<DslUseCases> {
  const route = dslRoutes.find((r) => r.method === method && r.path === path);
  if (!route) throw new Error(`Route not found: ${method} ${path}`);
  return route;
}

describe('dslRoutes', () => {
  let validate: ReturnType<typeof mock>;
  let preview: ReturnType<typeof mock>;
  let render: ReturnType<typeof mock>;
  let renderPublic: ReturnType<typeof mock>;
  let bc: DslUseCases;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';
  const mockSlug = 'john-doe-software-engineer';

  const mockDsl = {
    version: '2.0',
    content: { name: 'John Doe', title: 'Software Engineer' },
    styles: { typography: { fontSize: 'md' } },
  };

  const mockAst = {
    meta: { version: '1.0', generatedAt: '2024-01-01T00:00:00.000Z' },
    page: {
      widthMm: 210,
      heightMm: 297,
      marginTopMm: 10,
      marginBottomMm: 10,
      marginLeftMm: 10,
      marginRightMm: 10,
      columns: [],
      columnGapMm: 0,
    },
    sections: [],
    globalStyles: {},
  };

  const mockValidationResult = { valid: true, errors: null };

  beforeEach(() => {
    validate = mock(() => mockValidationResult);
    preview = mock(() => mockAst);
    render = mock(() => Promise.resolve({ ast: mockAst, resumeId: mockResumeId }));
    renderPublic = mock(() => Promise.resolve({ ast: mockAst, slug: mockSlug }));

    bc = {
      validateDsl: { execute: validate },
      previewDsl: { execute: preview },
      renderResumeDsl: { execute: render },
      renderPublicResumeDsl: { execute: renderPublic },
    } as unknown as DslUseCases;
  });

  describe('POST /v1/dsl/validate', () => {
    it('should validate DSL and return validation result', async () => {
      const route = findRoute('POST', '/v1/dsl/validate');
      const result = await route.handler(makeCtx({ body: mockDsl }), bc);

      expect(result).toEqual(mockValidationResult);
      expect(validate).toHaveBeenCalledWith(mockDsl);
    });
  });

  describe('POST /v1/dsl/preview', () => {
    it('should compile DSL to AST with default HTML target', async () => {
      const route = findRoute('POST', '/v1/dsl/preview');
      const result = await route.handler(makeCtx({ body: mockDsl, query: {} }), bc);

      expect((result as { ast: unknown }).ast).toBeDefined();
      expect(preview).toHaveBeenCalledWith(mockDsl, 'html');
    });

    it('should compile DSL to AST with PDF target', async () => {
      const route = findRoute('POST', '/v1/dsl/preview');
      await route.handler(makeCtx({ body: mockDsl, query: { target: 'pdf' } }), bc);
      expect(preview).toHaveBeenCalledWith(mockDsl, 'pdf');
    });
  });

  describe('GET /v1/dsl/render/:resumeId', () => {
    it('should render resume AST for authenticated user (default html, default locale)', async () => {
      const route = findRoute('GET', '/v1/dsl/render/:resumeId');
      const result = await route.handler(
        makeCtx({
          params: { resumeId: mockResumeId },
          query: {},
          user: { userId: mockUserId, email: 'u@example.com' },
        }),
        bc,
      );

      expect((result as { ast: unknown }).ast).toBeDefined();
      expect(render).toHaveBeenCalledWith({
        resumeId: mockResumeId,
        userId: mockUserId,
        target: 'html',
        locale: 'en',
      });
    });

    it('should support PDF target for rendering', async () => {
      const route = findRoute('GET', '/v1/dsl/render/:resumeId');
      await route.handler(
        makeCtx({
          params: { resumeId: mockResumeId },
          query: { target: 'pdf' },
          user: { userId: mockUserId, email: 'u@example.com' },
        }),
        bc,
      );
      expect(render).toHaveBeenCalledWith({
        resumeId: mockResumeId,
        userId: mockUserId,
        target: 'pdf',
        locale: 'en',
      });
    });

    it('should pass locale parameter to use case', async () => {
      const route = findRoute('GET', '/v1/dsl/render/:resumeId');
      await route.handler(
        makeCtx({
          params: { resumeId: mockResumeId },
          query: { target: 'html', locale: 'pt-BR' },
          user: { userId: mockUserId, email: 'u@example.com' },
        }),
        bc,
      );
      expect(render).toHaveBeenCalledWith({
        resumeId: mockResumeId,
        userId: mockUserId,
        target: 'html',
        locale: 'pt-BR',
      });
    });
  });

  describe('GET /v1/dsl/render/public/:slug', () => {
    it('should render public resume by slug', async () => {
      const route = findRoute('GET', '/v1/dsl/render/public/:slug');
      const result = await route.handler(makeCtx({ params: { slug: mockSlug }, query: {} }), bc);

      expect((result as { ast: unknown }).ast).toBeDefined();
      expect(renderPublic).toHaveBeenCalledWith({ slug: mockSlug, target: 'html', locale: 'en' });
    });

    it('should support PDF target for public rendering', async () => {
      const route = findRoute('GET', '/v1/dsl/render/public/:slug');
      await route.handler(makeCtx({ params: { slug: mockSlug }, query: { target: 'pdf' } }), bc);
      expect(renderPublic).toHaveBeenCalledWith({ slug: mockSlug, target: 'pdf', locale: 'en' });
    });

    it('should pass locale parameter to use case', async () => {
      const route = findRoute('GET', '/v1/dsl/render/public/:slug');
      await route.handler(
        makeCtx({ params: { slug: mockSlug }, query: { target: 'html', locale: 'pt-BR' } }),
        bc,
      );
      expect(renderPublic).toHaveBeenCalledWith({
        slug: mockSlug,
        target: 'html',
        locale: 'pt-BR',
      });
    });
  });
});
