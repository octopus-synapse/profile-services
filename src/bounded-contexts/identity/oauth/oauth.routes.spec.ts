/**
 * Spec: OAuth route handlers with the V2 D41 dynamic-redirect option.
 *
 * Each handler is a wire over a use case + the bundle's allowlist;
 * we mock the use-cases bundle and assert the handler:
 *  - falls back to the legacy `UI_BASE_URL/auth/oauth-complete` redirect
 *    when no `redirect_uri` query param is supplied
 *  - redirects to a validated `redirect_uri` (deep link or web)
 *  - rejects an unknown / unallowlisted `redirect_uri` with a 400-ish
 *    error so a tampered query can't leak the userId off-host
 *
 * Post #231 refactor: `handleStart` itself builds the provider authorize
 * URL via `OAuthPort.buildAuthorizeUrl` and returns a redirect (no
 * Passport guard layer anymore). The V2 D41 validator runs up-front and
 * 400s before the OAuth port is touched.
 */

import { describe, expect, it, mock } from 'bun:test';
import { signState } from '@/shared-kernel/auth';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route.types';
import { isRedirect } from '@/shared-kernel/http/route.types';
import type { OAuthHttpBundle } from './application/ports/oauth-http.bundle';
import { oauthRoutes, validateRedirectUriFromQuery } from './oauth.routes';

const JWT_SECRET = 'test-secret-for-state-cookie';

function findRoute(method: string, path: string): Route<OAuthHttpBundle> {
  const route = oauthRoutes.find((r) => r.method === method && r.path === path);
  if (!route) throw new Error(`Route not found: ${method} ${path}`);
  return route;
}

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

function makeBundle(overrides: Partial<OAuthHttpBundle> = {}): OAuthHttpBundle {
  const portProfile = {
    providerId: 'gh-42',
    email: 'me@example.com',
    emailVerified: true,
    displayName: 'Me',
    avatarUrl: null,
    accessToken: 'tok',
    refreshToken: null,
    raw: { login: 'mehandle' },
  };
  const upsert = { execute: mock(() => Promise.resolve({ userId: 'user-1', created: true })) };
  const availability = { execute: mock(() => ({ available: true })) };
  const config = {
    get: mock((key: string) => {
      if (key === 'UI_BASE_URL') return 'https://app.test';
      if (key === 'API_BASE_URL') return 'https://api.test';
      if (key === 'JWT_SECRET') return JWT_SECRET;
      return undefined;
    }),
    getOrDefault: mock(<T>(_k: string, def: T) => def),
  };
  const oauth = {
    buildAuthorizeUrl: mock(
      (provider: string) => `https://${provider}.example.com/oauth/authorize`,
    ),
    exchangeCode: mock(() => Promise.resolve(portProfile)),
  };
  return {
    upsert,
    availability,
    config,
    oauth,
    redirectUriAllowlist: [],
    ...overrides,
  } as unknown as OAuthHttpBundle;
}

describe('validateRedirectUriFromQuery', () => {
  it('accepts an absent redirect_uri (legacy flow)', () => {
    expect(validateRedirectUriFromQuery({}, [])).toEqual({ ok: true, uri: null });
  });

  it('rejects a non-string redirect_uri', () => {
    const result = validateRedirectUriFromQuery({ redirect_uri: 42 }, ['*']);
    expect(result.ok).toBe(false);
  });

  it('rejects when allowlist is empty but redirect_uri is present', () => {
    const result = validateRedirectUriFromQuery({ redirect_uri: 'patchcareers://auth/cb' }, []);
    expect(result.ok).toBe(false);
  });

  it('rejects an unknown redirect_uri', () => {
    const result = validateRedirectUriFromQuery({ redirect_uri: 'https://evil.com/cb' }, [
      'patchcareers://*',
    ]);
    expect(result.ok).toBe(false);
  });

  it('accepts an allowlisted redirect_uri', () => {
    const result = validateRedirectUriFromQuery({ redirect_uri: 'patchcareers://auth/callback' }, [
      'patchcareers://*',
    ]);
    expect(result).toEqual({ ok: true, uri: 'patchcareers://auth/callback' });
  });
});

describe('oauthRoutes — github start', () => {
  it('redirects to the provider authorize URL on legacy flow (no redirect_uri)', async () => {
    const route = findRoute('GET', '/v1/auth/oauth/github/start');
    const bundle = makeBundle();
    const result = await route.handler(makeCtx({ query: {} }), bundle);
    expect(isRedirect(result)).toBe(true);
    expect((result as { url: string }).url).toContain('github.example.com/oauth/authorize');
  });

  it('rejects an unallowlisted redirect_uri with a 400-tagged error', async () => {
    const route = findRoute('GET', '/v1/auth/oauth/github/start');
    const bundle = makeBundle({ redirectUriAllowlist: ['patchcareers://*'] });
    const ctx = makeCtx({ query: { redirect_uri: 'https://evil.com/cb' } });
    let caught: unknown;
    try {
      await route.handler(ctx, bundle);
    } catch (err) {
      caught = err;
    }
    expect((caught as { statusCode?: number } | undefined)?.statusCode).toBe(400);
  });

  it('passes through (redirects to provider) when redirect_uri is allowlisted', async () => {
    const route = findRoute('GET', '/v1/auth/oauth/github/start');
    const bundle = makeBundle({ redirectUriAllowlist: ['patchcareers://*'] });
    const ctx = makeCtx({ query: { redirect_uri: 'patchcareers://auth/cb' } });
    const result = await route.handler(ctx, bundle);
    expect(isRedirect(result)).toBe(true);
    expect((result as { url: string }).url).toContain('github.example.com/oauth/authorize');
  });
});

/**
 * Helper: prime a context with a valid signed state cookie + matching
 * state query param so the callback's CSRF check passes and we exercise
 * the V2 D41 redirect-resolution branch under test.
 */
function makeCallbackCtx(query: Record<string, unknown> = {}, provider = 'github'): HttpCtx {
  const state = 'state-value-123';
  const signed = signState(state, JWT_SECRET);
  return makeCtx({
    query: { code: 'auth-code', state, ...query },
    cookies: { [`oauth_state_${provider}`]: signed },
  });
}

describe('oauthRoutes — github callback', () => {
  it('redirects to UI_BASE_URL/auth/oauth-complete when no redirect_uri (legacy web flow)', async () => {
    const route = findRoute('GET', '/v1/auth/oauth/github/callback');
    const bundle = makeBundle();
    const ctx = makeCallbackCtx();
    const result = await route.handler(ctx, bundle);
    expect(isRedirect(result)).toBe(true);
    const url = (result as { url: string }).url;
    expect(url.startsWith('https://app.test/auth/oauth-complete?')).toBe(true);
    expect(url).toContain('provider=github');
    expect(url).toContain('userId=user-1');
    expect(url).toContain('created=true');
    expect(url).toContain('email=me%40example.com');
    expect(url).toContain('githubLogin=mehandle');
  });

  it('redirects to the allowlisted redirect_uri (mobile deep link)', async () => {
    const route = findRoute('GET', '/v1/auth/oauth/github/callback');
    const bundle = makeBundle({ redirectUriAllowlist: ['patchcareers://*'] });
    const ctx = makeCallbackCtx({ redirect_uri: 'patchcareers://auth/cb' });
    const result = await route.handler(ctx, bundle);
    expect(isRedirect(result)).toBe(true);
    const url = (result as { url: string }).url;
    expect(url.startsWith('patchcareers://auth/cb?')).toBe(true);
    expect(url).toContain('userId=user-1');
    expect(url).toContain('provider=github');
  });

  it('rejects an unallowlisted redirect_uri at the callback', async () => {
    const route = findRoute('GET', '/v1/auth/oauth/github/callback');
    const bundle = makeBundle({ redirectUriAllowlist: ['patchcareers://*'] });
    const ctx = makeCallbackCtx({ redirect_uri: 'https://evil.com/cb' });
    let caught: unknown;
    try {
      await route.handler(ctx, bundle);
    } catch (err) {
      caught = err;
    }
    expect((caught as { statusCode?: number } | undefined)?.statusCode).toBe(400);
  });

  it('preserves existing query params on the redirect target (uses & separator)', async () => {
    const route = findRoute('GET', '/v1/auth/oauth/github/callback');
    const bundle = makeBundle({ redirectUriAllowlist: ['https://app.test/*'] });
    const ctx = makeCallbackCtx({ redirect_uri: 'https://app.test/after?next=/home' });
    const result = await route.handler(ctx, bundle);
    expect(isRedirect(result)).toBe(true);
    const url = (result as { url: string }).url;
    // The existing query in `redirect_uri` passes through verbatim;
    // we only append our own params after it.
    expect(url).toContain('next=/home');
    expect(url).toContain('provider=github');
    // Should append with `&`, not a second `?`.
    const questionMarks = (url.match(/\?/g) ?? []).length;
    expect(questionMarks).toBe(1);
  });
});
