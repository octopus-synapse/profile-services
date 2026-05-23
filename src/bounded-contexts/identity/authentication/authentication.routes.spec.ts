/**
 * Spec: V2 D42 — POST /v1/auth/login and /v1/auth/login/verify-2fa
 * honour the `Accept-Mode: tokens` header. With `tokens`: NO Set-Cookie
 * is staged on the cookie jar (so a mobile/native client doesn't carry
 * a useless cookie). Without the header (or `cookie`): unchanged
 * behaviour — the session cookie is staged via `ctxCookieWriter`.
 *
 * Post-#231 contract note: the login response payload is
 * `{userId, twoFactorRequired}` per `LoginResponseSchema` and does NOT
 * carry tokens in the body — mobile clients receive their token pair
 * through `POST /v1/auth/session/tokens` (the one-shot exchange flow
 * added in this PR). The login response carries the
 * `sessionExchangeId` only when `Accept-Mode: tokens` and 2FA is not
 * pending. The `createSession` and `createSessionExchange` use-cases
 * are mocked here; we only assert handler outputs and the cookie-jar
 * staging.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route.types';
import type { AuthenticationHttpBundle } from './application/ports/authentication-http.bundle';
import { authenticationRoutes } from './authentication.routes';

interface MockBundle {
  login: {
    execute: ReturnType<typeof mock>;
    completeWithTwoFactor: ReturnType<typeof mock>;
  };
  createSession: { execute: ReturnType<typeof mock> };
  createSessionExchange: { execute: ReturnType<typeof mock> };
  exchangeSessionForTokens: { execute: ReturnType<typeof mock> };
}

function findRoute(method: string, path: string): Route<AuthenticationHttpBundle> {
  const route = authenticationRoutes.find((r) => r.method === method && r.path === path);
  if (!route) throw new Error(`Route not found: ${method} ${path}`);
  return route;
}

function makeCtx(overrides: Partial<HttpCtx> = {}): HttpCtx {
  return {
    method: 'POST',
    path: '/',
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    userAgent: 'test',
    body: undefined,
    query: {},
    params: {},
    user: null,
    state: {},
    ...overrides,
  };
}

const baseLoginResult = {
  userId: 'u-1',
  twoFactorRequired: false,
};

function makeBundle(overrides: Partial<MockBundle> = {}): AuthenticationHttpBundle {
  const captureCookieOps = (cookieWriter: unknown) => {
    const writer = cookieWriter as {
      setCookie: (n: string, v: string, o: unknown) => void;
      clearCookie: (n: string, o: unknown) => void;
    };
    // exercise the writer once so the spec can detect "did this writer
    // route through the staging jar or no-op?".
    writer.setCookie('access_token', 'token-value', {});
  };
  return {
    login: {
      execute: mock(() => Promise.resolve({ ...baseLoginResult })),
      completeWithTwoFactor: mock(() =>
        Promise.resolve({ ...baseLoginResult, email: 'me@example.com' }),
      ),
      ...overrides.login,
    },
    createSession: {
      execute: mock((cmd: { cookieWriter: unknown }) => {
        captureCookieOps(cmd.cookieWriter);
        return Promise.resolve({ success: true });
      }),
      ...overrides.createSession,
    },
    createSessionExchange: {
      execute: mock(() => Promise.resolve({ sessionExchangeId: 'sxc_fixture' })),
      ...overrides.createSessionExchange,
    },
    exchangeSessionForTokens: {
      execute: mock(() =>
        Promise.resolve({
          userId: 'u-1',
          accessToken: 'access-fixture',
          refreshToken: 'refresh-fixture',
          expiresIn: 900,
        }),
      ),
      ...overrides.exchangeSessionForTokens,
    },
  } as unknown as AuthenticationHttpBundle;
}

function readCookieJar(ctx: HttpCtx): { sets: unknown[]; clears: unknown[] } {
  const jar = (ctx.state as Record<string, unknown>).__cookieJar as
    | { sets: unknown[]; clears: unknown[] }
    | undefined;
  return jar ?? { sets: [], clears: [] };
}

describe('POST /v1/auth/login — Accept-Mode header', () => {
  let bundle: AuthenticationHttpBundle;

  beforeEach(() => {
    bundle = makeBundle();
  });

  it('legacy flow (no Accept-Mode): stages a Set-Cookie and returns the userId envelope', async () => {
    const route = findRoute('POST', '/v1/auth/login');
    const ctx = makeCtx({ body: { email: 'me@example.com', password: 'secret' } });
    const result = await route.handler(ctx, bundle);

    const jar = readCookieJar(ctx);
    expect(jar.sets.length).toBe(1);
    expect((jar.sets[0] as { name: string }).name).toBe('access_token');

    expect((result as { userId: string }).userId).toBe('u-1');
    expect((result as { twoFactorRequired: boolean }).twoFactorRequired).toBe(false);
  });

  it('Accept-Mode: cookie (explicit) behaves like legacy', async () => {
    const route = findRoute('POST', '/v1/auth/login');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'cookie' },
      body: { email: 'me@example.com', password: 'secret' },
    });
    await route.handler(ctx, bundle);
    expect(readCookieJar(ctx).sets.length).toBe(1);
  });

  it('Accept-Mode: tokens does NOT stage a Set-Cookie and includes sessionExchangeId', async () => {
    const route = findRoute('POST', '/v1/auth/login');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'tokens' },
      body: { email: 'me@example.com', password: 'secret' },
    });
    const result = await route.handler(ctx, bundle);

    const jar = readCookieJar(ctx);
    expect(jar.sets.length).toBe(0);

    // Response carries the one-shot exchange id mobile clients swap
    // for a token pair via POST /v1/auth/session/tokens.
    expect((result as { userId: string }).userId).toBe('u-1');
    expect((result as { twoFactorRequired: boolean }).twoFactorRequired).toBe(false);
    expect((result as { sessionExchangeId: string }).sessionExchangeId).toBe('sxc_fixture');
    expect((bundle as unknown as MockBundle).createSessionExchange.execute).toHaveBeenCalledTimes(
      1,
    );
  });

  it('cookie flow does NOT issue a sessionExchangeId', async () => {
    const route = findRoute('POST', '/v1/auth/login');
    const ctx = makeCtx({ body: { email: 'me@example.com', password: 'secret' } });
    const result = await route.handler(ctx, bundle);

    expect((result as { sessionExchangeId?: string }).sessionExchangeId).toBeUndefined();
    expect((bundle as unknown as MockBundle).createSessionExchange.execute).not.toHaveBeenCalled();
  });

  it('Accept-Mode: tokens is case-insensitive', async () => {
    const route = findRoute('POST', '/v1/auth/login');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'Tokens' },
      body: { email: 'me@example.com', password: 'secret' },
    });
    await route.handler(ctx, bundle);
    expect(readCookieJar(ctx).sets.length).toBe(0);
  });

  it('skips createSession entirely when 2FA is required (no Accept-Mode interaction)', async () => {
    const twofaBundle = makeBundle({
      login: {
        execute: mock(() => Promise.resolve({ ...baseLoginResult, twoFactorRequired: true })),
        completeWithTwoFactor: mock(() => Promise.resolve({})),
      },
    });
    const route = findRoute('POST', '/v1/auth/login');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'tokens' },
      body: { email: 'me@example.com', password: 'secret' },
    });
    const result = await route.handler(ctx, twofaBundle);

    expect((twofaBundle as unknown as MockBundle).createSession.execute).not.toHaveBeenCalled();
    expect((result as { twoFactorRequired: boolean }).twoFactorRequired).toBe(true);
  });
});

describe('POST /v1/auth/login/verify-2fa — Accept-Mode header', () => {
  let bundle: AuthenticationHttpBundle;

  beforeEach(() => {
    bundle = makeBundle();
  });

  it('legacy flow stages Set-Cookie', async () => {
    const route = findRoute('POST', '/v1/auth/login/verify-2fa');
    const ctx = makeCtx({ body: { userId: 'u-1', code: '123456' } });
    await route.handler(ctx, bundle);
    expect(readCookieJar(ctx).sets.length).toBe(1);
  });

  it('Accept-Mode: tokens does NOT stage Set-Cookie and returns the userId + exchange envelope', async () => {
    const route = findRoute('POST', '/v1/auth/login/verify-2fa');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'tokens' },
      body: { userId: 'u-1', code: '123456' },
    });
    const result = await route.handler(ctx, bundle);

    expect(readCookieJar(ctx).sets.length).toBe(0);
    expect((result as { userId: string }).userId).toBe('u-1');
    expect((result as { sessionExchangeId: string }).sessionExchangeId).toBe('sxc_fixture');
    expect((bundle as unknown as MockBundle).createSessionExchange.execute).toHaveBeenCalledTimes(
      1,
    );
  });

  it('cookie flow does NOT issue a sessionExchangeId', async () => {
    const route = findRoute('POST', '/v1/auth/login/verify-2fa');
    const ctx = makeCtx({ body: { userId: 'u-1', code: '123456' } });
    const result = await route.handler(ctx, bundle);

    expect((result as { sessionExchangeId?: string }).sessionExchangeId).toBeUndefined();
    expect((bundle as unknown as MockBundle).createSessionExchange.execute).not.toHaveBeenCalled();
  });
});

describe('POST /v1/auth/session/tokens — mobile exchange flow', () => {
  let bundle: AuthenticationHttpBundle;

  beforeEach(() => {
    bundle = makeBundle();
  });

  it('swaps a sessionExchangeId for a fresh access/refresh token pair', async () => {
    const route = findRoute('POST', '/v1/auth/session/tokens');
    const ctx = makeCtx({ body: { sessionExchangeId: 'sxc_test' } });

    const result = await route.handler(ctx, bundle);

    expect(result).toEqual({
      userId: 'u-1',
      accessToken: 'access-fixture',
      refreshToken: 'refresh-fixture',
      expiresIn: 900,
    });
    const mockBundle = bundle as unknown as MockBundle;
    expect(mockBundle.exchangeSessionForTokens.execute).toHaveBeenCalledTimes(1);
    expect(mockBundle.exchangeSessionForTokens.execute).toHaveBeenCalledWith({
      sessionExchangeId: 'sxc_test',
    });
  });

  it('does not stage any Set-Cookie (purely body-based response)', async () => {
    const route = findRoute('POST', '/v1/auth/session/tokens');
    const ctx = makeCtx({ body: { sessionExchangeId: 'sxc_test' } });

    await route.handler(ctx, bundle);

    expect(readCookieJar(ctx).sets.length).toBe(0);
    expect(readCookieJar(ctx).clears.length).toBe(0);
  });
});
