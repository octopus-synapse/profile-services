import { describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bcOf, loadSwaggerInfo, pickPersona, toSwaggerPathTemplate } from './route-classifier';

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
