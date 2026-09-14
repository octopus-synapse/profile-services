/**
 * Spec: the dev-lab descriptors keep the properties that make the lab safe to
 * exist — no SDK surface, gate parity with the production tailor route, a
 * `resumeId` in the PATH (the min-quality guard reads it from there), and a
 * run body that cannot ask for persistence.
 */

import { describe, expect, it } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { isResponseWithHeaders } from '@/shared-kernel/http/route';
import type { Route } from '@/shared-kernel/http/route.types';
import { StreamableFile } from '@/shared-kernel/http/streamable-file';
import { TAILOR_LAB_CSP, type TailorLabBundle } from './tailor-lab.bundle';
import { tailorLabDevRoutes } from './tailor-lab.dev-routes';
import { TailorLabRunBody } from './tailor-lab.dev-routes.schemas';

function findRoute(method: string, path: string): Route<TailorLabBundle> {
  const route = tailorLabDevRoutes.find((r) => r.method === method && r.path === path);
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

const html = new TextEncoder().encode('<!doctype html><title>lab</title>');
const fakeBundle = {
  readHtml: () => html,
  defaults: { systemPrompt: 'S', model: 'gpt-4o-mini', temperature: 0.2, maxTokens: 1500 },
} as unknown as TailorLabBundle;

describe('tailor lab routes', () => {
  it('never reach the generated SDK', () => {
    for (const route of tailorLabDevRoutes) {
      expect(route.sdk?.exported).toBe(false);
      expect(route.openapi.description).toBeTruthy();
    }
  });

  it('serves the page as text/html under its own CSP', async () => {
    const route = findRoute('GET', '/dev/tailor-lab');
    const result = await route.handler(makeCtx(), fakeBundle);
    if (!isResponseWithHeaders(result)) throw new Error('expected withHeaders result');
    expect(result.headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(result.headers['Content-Security-Policy']).toBe(TAILOR_LAB_CSP);
    expect((result.body as StreamableFile).source).toBe(html);
  });

  it('CSP allows the inline page script and the preview iframe, and forbids framing the lab', () => {
    expect(TAILOR_LAB_CSP).toContain("script-src 'self' 'unsafe-inline'");
    expect(TAILOR_LAB_CSP).toContain("frame-src 'self'");
    expect(TAILOR_LAB_CSP).toContain("frame-ancestors 'none'");
  });

  it('mirrors the production tailor gates, with resumeId in the path', () => {
    const run = findRoute('POST', '/v1/dev/tailor-lab/resumes/:resumeId/run');
    expect(run.auth).toEqual({ kind: 'jwt' });
    expect(run.guards).toEqual([
      { id: 'fit-profile' },
      { id: 'min-quality', metadata: { min: 50, resumeParam: 'resumeId' } },
      { id: 'external-api' },
    ]);
    // `resolveMinQualityTarget` reads the resume from route params; a
    // body-only id silently falls back to primary-resume @ 70.
    expect(run.path).toContain(':resumeId');
    expect(run.params).toBeDefined();
  });

  it('run body cannot request persistence', () => {
    expect(TailorLabRunBody.safeParse({ jobId: crypto.randomUUID(), dryRun: false }).success).toBe(
      false,
    );
    const ok = TailorLabRunBody.safeParse({ jobId: crypto.randomUUID() });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.dryRun).toBe(true);
  });

  it('run body requires a job id or a pasted description', () => {
    expect(TailorLabRunBody.safeParse({}).success).toBe(false);
    expect(TailorLabRunBody.safeParse({ jobDescription: 'too short' }).success).toBe(false);
    expect(
      TailorLabRunBody.safeParse({ jobDescription: 'a job description long enough' }).success,
    ).toBe(true);
  });

  it('accepts the knobs the lab varies, and rejects out-of-range values', () => {
    const base = { jobDescription: 'a job description long enough' };
    expect(TailorLabRunBody.safeParse({ ...base, temperature: 1.4 }).success).toBe(true);
    expect(TailorLabRunBody.safeParse({ ...base, temperature: 2.5 }).success).toBe(false);
    expect(TailorLabRunBody.safeParse({ ...base, maxTokens: 32 }).success).toBe(false);
  });
});
