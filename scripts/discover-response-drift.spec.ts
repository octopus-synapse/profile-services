import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import type { Route } from '@/shared-kernel/http/route';
import {
  bcOf,
  fillPathParams,
  formatReport,
  isProbable,
  loadSwaggerInfo,
  pickPersona,
  type RouteDriftReport,
  toSwaggerPathTemplate,
} from './discover-response-drift';

const FIXTURE_USER_ID = '01900000-0000-7000-a000-000000000020';
const FIXTURE_RESUME_ID = '01900000-0000-7000-a000-000000000010';
const FIXTURE_JOB_ID = '01900000-0000-7000-a000-000000000030';
const FIXTURE_GENERIC_ID = '01900000-0000-7000-a000-000000000001';
const FIXTURE_SLUG = 'fixture-slug';

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    method: 'GET',
    path: '/v1/fixture',
    auth: { kind: 'public' },
    response: z.object({}),
    openapi: { summary: '', tags: [], description: '' },
    handler: async () => ({}),
    ...overrides,
  } as Route;
}

describe('fillPathParams', () => {
  test('substitutes :userId with the user fixture UUID', () => {
    expect(fillPathParams('/v1/users/:userId')).toBe(`/v1/users/${FIXTURE_USER_ID}`);
  });

  test('substitutes :resumeId with the resume fixture UUID', () => {
    expect(fillPathParams('/v1/resumes/:resumeId')).toBe(`/v1/resumes/${FIXTURE_RESUME_ID}`);
  });

  test('substitutes :jobId with the job fixture UUID', () => {
    expect(fillPathParams('/v1/jobs/:jobId')).toBe(`/v1/jobs/${FIXTURE_JOB_ID}`);
  });

  test('falls back to the generic ID for any *Id-suffixed token', () => {
    expect(fillPathParams('/v1/foo/:sectionId')).toBe(`/v1/foo/${FIXTURE_GENERIC_ID}`);
    expect(fillPathParams('/v1/foo/:bookmarkId')).toBe(`/v1/foo/${FIXTURE_GENERIC_ID}`);
  });

  test('substitutes the bare :id token with the generic ID', () => {
    expect(fillPathParams('/v1/posts/:id')).toBe(`/v1/posts/${FIXTURE_GENERIC_ID}`);
  });

  test('substitutes any other named token with the slug fixture', () => {
    expect(fillPathParams('/v1/profiles/:username')).toBe(`/v1/profiles/${FIXTURE_SLUG}`);
    expect(fillPathParams('/v1/x/:slug')).toBe(`/v1/x/${FIXTURE_SLUG}`);
  });

  test('substitutes multiple tokens in the same path', () => {
    expect(fillPathParams('/v1/users/:userId/resumes/:resumeId')).toBe(
      `/v1/users/${FIXTURE_USER_ID}/resumes/${FIXTURE_RESUME_ID}`,
    );
  });

  test('leaves a token-free path unchanged', () => {
    expect(fillPathParams('/v1/health')).toBe('/v1/health');
  });
});

describe('isProbable', () => {
  test('accepts a plain GET with a response schema', () => {
    expect(isProbable(makeRoute())).toBe(true);
  });

  test('rejects non-GET methods', () => {
    expect(isProbable(makeRoute({ method: 'POST' }))).toBe(false);
    expect(isProbable(makeRoute({ method: 'DELETE' }))).toBe(false);
  });

  test('rejects routes whose kind is sse / stream / redirect', () => {
    expect(isProbable(makeRoute({ kind: 'sse' } as Partial<Route>))).toBe(false);
    expect(isProbable(makeRoute({ kind: 'stream' } as Partial<Route>))).toBe(false);
    expect(isProbable(makeRoute({ kind: 'redirect' } as Partial<Route>))).toBe(false);
  });

  test('rejects binary responses (PDF/PNG/etc.)', () => {
    expect(
      isProbable(makeRoute({ binary: { mediaType: 'application/pdf' } } as Partial<Route>)),
    ).toBe(false);
  });

  test('rejects routes without a declared response schema', () => {
    expect(isProbable(makeRoute({ response: undefined } as Partial<Route>))).toBe(false);
  });
});

describe('bcOf', () => {
  test('extracts the first segment after the version prefix', () => {
    expect(bcOf('/v1/users/123')).toBe('users');
    expect(bcOf('/v2/jobs')).toBe('jobs');
  });

  test('handles hyphenated BC names', () => {
    expect(bcOf('/v1/section-types')).toBe('section-types');
    expect(bcOf('/v1/resume-styles/abc')).toBe('resume-styles');
  });

  test('falls back to "misc" when the prefix does not match', () => {
    expect(bcOf('/health')).toBe('misc');
    expect(bcOf('')).toBe('misc');
  });
});

describe('formatReport', () => {
  test('reports zero drifts with an explicit success line', () => {
    const md = formatReport([
      { route: 'GET /v1/foo', status: 200, persona: 'anonymous', drifts: [] },
    ]);
    expect(md).toContain('Total drifts: 0');
    expect(md).toContain('All probed endpoints match their declared response schemas.');
  });

  test('groups drifts by BC and renders each kind', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/users/me',
        status: 200,
        persona: 'user',
        drifts: [
          { kind: 'extra-field', path: ['secret'] },
          { kind: 'missing-field', path: ['email'], expected: 'string' },
          { kind: 'should-be-nullable', path: ['name'] },
          { kind: 'should-be-optional', path: ['age'] },
          { kind: 'type-mismatch', path: ['age'], expected: 'number', actual: 'string' },
        ],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('## users (5 drifts)');
    expect(md).toContain('### GET /v1/users/me → 200 (persona=user)');
    expect(md).toContain('extra field: `secret`');
    expect(md).toContain('missing field: `email`');
    expect(md).toContain('should be nullable: `name`');
    expect(md).toContain('should be optional: `age`');
    expect(md).toContain('type mismatch: `age` (schema=number, runtime=string)');
  });

  test('omits BC sections that have zero drifts', () => {
    const reports: RouteDriftReport[] = [
      { route: 'GET /v1/users/me', status: 200, persona: 'user', drifts: [] },
      {
        route: 'GET /v1/jobs',
        status: 200,
        persona: 'admin',
        drifts: [{ kind: 'extra-field', path: ['internal'] }],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('## jobs (1 drifts)');
    expect(md).not.toContain('## users');
  });

  test('surfaces probe errors next to the route', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/foo',
        status: 0,
        persona: 'anonymous',
        drifts: [],
        error: 'connection refused',
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('## foo');
    expect(md).toContain('error: connection refused');
  });

  test('renders <root> when a drift path is empty', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/x',
        status: 200,
        persona: 'anonymous',
        drifts: [{ kind: 'type-mismatch', path: [], expected: 'object', actual: 'string' }],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('type mismatch: `<root>`');
  });

  test('total drifts header counts across reports', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/a',
        status: 200,
        persona: 'anonymous',
        drifts: [{ kind: 'extra-field', path: ['x'] }],
      },
      {
        route: 'GET /v1/b',
        status: 200,
        persona: 'admin',
        drifts: [
          { kind: 'extra-field', path: ['y'] },
          { kind: 'missing-field', path: ['z'], expected: 'string' },
        ],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('Total drifts: 3');
    expect(md).toContain('Probed: 2 GET endpoints');
  });

  test('renders auth-mismatch drifts when the chosen persona was rejected', () => {
    const reports: RouteDriftReport[] = [
      {
        route: 'GET /v1/admin/users',
        status: 403,
        persona: 'user',
        drifts: [{ kind: 'auth-mismatch', path: [], persona: 'user', status: 403 }],
      },
    ];
    const md = formatReport(reports);
    expect(md).toContain('### GET /v1/admin/users → 403 (persona=user)');
    expect(md).toContain('auth mismatch: persona=`user` got HTTP 403');
  });
});

describe('toSwaggerPathTemplate', () => {
  test('prepends /api when missing and converts :foo to {foo}', () => {
    expect(toSwaggerPathTemplate('/v1/users/:userId')).toBe('/api/v1/users/{userId}');
  });

  test('keeps an existing /api prefix', () => {
    expect(toSwaggerPathTemplate('/api/v1/health')).toBe('/api/v1/health');
  });

  test('handles multiple params', () => {
    expect(toSwaggerPathTemplate('/v1/users/:userId/resumes/:resumeId')).toBe(
      '/api/v1/users/{userId}/resumes/{resumeId}',
    );
  });
});

function writeFixtureSwagger(): string {
  const dir = mkdtempSync(join(tmpdir(), 'drift-swagger-'));
  const file = join(dir, 'swagger.json');
  writeFileSync(
    file,
    JSON.stringify({
      info: { 'x-admin-permissions': ['admin:full_access', 'platform:manage'] },
      paths: {
        '/api/v1/health': { get: { 'x-auth': 'public' } },
        '/api/v1/users/me': { get: { 'x-auth': 'jwt', 'x-permission': 'user:read_self' } },
        '/api/v1/admin/users': { get: { 'x-auth': 'jwt', 'x-permission': 'admin:full_access' } },
        '/api/v1/admin/items/{id}': {
          get: { 'x-auth': 'jwt', 'x-permission': 'platform:manage' },
        },
      },
    }),
  );
  return file;
}

describe('loadSwaggerInfo + pickPersona', () => {
  test('classifies public routes as anonymous', () => {
    const info = loadSwaggerInfo(writeFixtureSwagger());
    const { persona, meta } = pickPersona('GET', '/v1/health', info);
    expect(persona).toBe('anonymous');
    expect(meta?.auth).toBe('public');
  });

  test('classifies non-admin JWT routes as user', () => {
    const info = loadSwaggerInfo(writeFixtureSwagger());
    const { persona, meta } = pickPersona('GET', '/v1/users/me', info);
    expect(persona).toBe('user');
    expect(meta?.permission).toBe('user:read_self');
  });

  test('classifies admin-permission routes as admin', () => {
    const info = loadSwaggerInfo(writeFixtureSwagger());
    const { persona } = pickPersona('GET', '/v1/admin/users', info);
    expect(persona).toBe('admin');
  });

  test('matches templated paths via :param to swagger {param}', () => {
    const info = loadSwaggerInfo(writeFixtureSwagger());
    const { persona } = pickPersona('GET', '/v1/admin/items/:id', info);
    expect(persona).toBe('admin');
  });

  test('falls back to admin persona when route is unknown to swagger', () => {
    const info = loadSwaggerInfo(writeFixtureSwagger());
    const { persona, meta } = pickPersona('GET', '/v1/missing', info);
    expect(persona).toBe('admin');
    expect(meta).toBeNull();
  });
});
