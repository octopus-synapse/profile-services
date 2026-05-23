/**
 * Spec: well-known route descriptors return the bundle's docs with the
 * mandatory `Content-Type: application/json` header (Apple is strict).
 */

import { describe, expect, it } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import { isResponseWithHeaders } from '@/shared-kernel/http/route';
import type { Route } from '@/shared-kernel/http/route.types';
import type { WellKnownBundle } from './well-known.bundle';
import { wellKnownRoutes } from './well-known.routes';

function findRoute(method: string, path: string): Route<WellKnownBundle> {
  const route = wellKnownRoutes.find((r) => r.method === method && r.path === path);
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

const fakeBundle: WellKnownBundle = {
  aasa: {
    applinks: {
      details: [{ appIDs: ['TEAM.app'], components: [{ '/': '/jobs/*' }] }],
    },
  },
  assetLinks: [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.patchcareers.app',
        sha256_cert_fingerprints: ['AA:BB'],
      },
    },
  ],
  logger: { log: () => undefined, error: () => undefined } as unknown as WellKnownBundle['logger'],
};

describe('well-known routes', () => {
  it('exposes AASA at /.well-known/apple-app-site-association (no .json)', () => {
    expect(
      wellKnownRoutes.some(
        (r) => r.path === '/.well-known/apple-app-site-association' && r.method === 'GET',
      ),
    ).toBe(true);
  });

  it('exposes assetlinks at /.well-known/assetlinks.json', () => {
    expect(
      wellKnownRoutes.some((r) => r.path === '/.well-known/assetlinks.json' && r.method === 'GET'),
    ).toBe(true);
  });

  it('AASA handler returns the bundle doc with Content-Type: application/json', async () => {
    const route = findRoute('GET', '/.well-known/apple-app-site-association');
    const result = await route.handler(makeCtx(), fakeBundle);
    expect(isResponseWithHeaders(result)).toBe(true);
    const wrapped = result as { headers: Record<string, string>; body: unknown };
    expect(wrapped.headers['Content-Type']).toBe('application/json');
    expect(wrapped.body).toEqual(fakeBundle.aasa);
  });

  it('assetlinks handler returns the bundle array with Content-Type: application/json', async () => {
    const route = findRoute('GET', '/.well-known/assetlinks.json');
    const result = await route.handler(makeCtx(), fakeBundle);
    expect(isResponseWithHeaders(result)).toBe(true);
    const wrapped = result as { headers: Record<string, string>; body: unknown };
    expect(wrapped.headers['Content-Type']).toBe('application/json');
    expect(wrapped.body).toEqual(fakeBundle.assetLinks);
  });

  it('both routes opt out of responseWrapper / authExtractor / rateLimit', () => {
    for (const route of wellKnownRoutes) {
      const skipSet = new Set(route.skip ?? []);
      expect(skipSet.has('responseWrapper')).toBe(true);
      expect(skipSet.has('authExtractor')).toBe(true);
      expect(skipSet.has('rateLimit')).toBe(true);
    }
  });

  it('both routes are public (no JWT)', () => {
    for (const route of wellKnownRoutes) {
      expect(route.auth.kind).toBe('public');
    }
  });
});
