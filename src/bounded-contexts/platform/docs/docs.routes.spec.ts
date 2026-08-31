/**
 * Spec: docs route descriptors serve the boot-time buffers with the
 * right Content-Type, and the HTML route overrides the global CSP so
 * the Scalar CDN bundle isn't blocked by `script-src 'self'`.
 */

import { describe, expect, it } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { isResponseWithHeaders } from '@/shared-kernel/http/route';
import type { Route } from '@/shared-kernel/http/route.types';
import { StreamableFile } from '@/shared-kernel/http/streamable-file';
import { DOCS_PAGE_CSP, type DocsBundle, SCALAR_CDN_URL } from './docs.bundle';
import { docsRoutes } from './docs.routes';

function findRoute(method: string, path: string): Route<DocsBundle> {
  const route = docsRoutes.find((r) => r.method === method && r.path === path);
  if (!route) throw new Error(`Route not found: ${method} ${path}`);
  return route;
}

function makeCtx(): HttpCtx {
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
  };
}

const fakeBundle: DocsBundle = {
  spec: new TextEncoder().encode('{"openapi":"3.0.0"}'),
  html: new TextEncoder().encode('<!doctype html>'),
  logger: { log: () => undefined, error: () => undefined } as unknown as DocsBundle['logger'],
};

describe('docs routes', () => {
  it('are public and skip the response wrapper / auth / rate-limit stages', () => {
    for (const route of docsRoutes) {
      expect(route.auth).toEqual({ kind: 'public' });
      expect(route.skip).toEqual(['responseWrapper', 'authExtractor', 'rateLimit']);
      expect(route.sdk?.exported).toBe(false);
    }
  });

  it('serves the Scalar page as text/html with the relaxed CSP', async () => {
    const route = findRoute('GET', '/docs');
    const result = await route.handler(makeCtx(), fakeBundle);
    if (!isResponseWithHeaders(result)) throw new Error('expected withHeaders result');
    expect(result.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(result.headers['Content-Security-Policy']).toBe(DOCS_PAGE_CSP);
    expect(result.body).toBeInstanceOf(StreamableFile);
    expect((result.body as StreamableFile).source).toBe(fakeBundle.html);
  });

  it('serves the OpenAPI document verbatim as application/json', async () => {
    const route = findRoute('GET', '/docs/openapi.json');
    const result = await route.handler(makeCtx(), fakeBundle);
    if (!isResponseWithHeaders(result)) throw new Error('expected withHeaders result');
    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.body).toBeInstanceOf(StreamableFile);
    expect((result.body as StreamableFile).source).toBe(fakeBundle.spec);
  });

  it('CSP allows the pinned CDN host and forbids framing', () => {
    const cdnHost = new URL(SCALAR_CDN_URL).origin;
    expect(DOCS_PAGE_CSP).toContain(`script-src 'self' ${cdnHost}`);
    expect(DOCS_PAGE_CSP).toContain("frame-ancestors 'none'");
    expect(DOCS_PAGE_CSP).toContain("object-src 'none'");
  });
});
