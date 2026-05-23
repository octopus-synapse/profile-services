/**
 * Spec: V2 D42 — POST /auth/login and /auth/login/verify-2fa honour
 * the `Accept-Mode: tokens` header. With `tokens`: no Set-Cookie is
 * staged on the cookie jar and the response body carries the access /
 * refresh / expiresIn tokens. Without the header (or `cookie`):
 * unchanged behaviour from the web flow.
 *
 * The createSession use-case is mocked — we only assert what its
 * `cookieWriter` argument does to the cookie jar.
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route';
import type { AuthenticationHttpBundle } from './application/ports/authentication-http.bundle';
import { authenticationRoutes } from './authentication.routes';

interface MockBundle {
  login: {
    execute: ReturnType<typeof mock>;
    completeWithTwoFactor: ReturnType<typeof mock>;
  };
  createSession: { execute: ReturnType<typeof mock> };
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
  accessToken: 'jwt-access',
  refreshToken: 'jwt-refresh',
  expiresIn: 900,
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
  } as unknown as AuthenticationHttpBundle;
}

function readCookieJar(ctx: HttpCtx): { sets: unknown[]; clears: unknown[] } {
  const jar = (ctx.state as Record<string, unknown>).__cookieJar as
    | { sets: unknown[]; clears: unknown[] }
    | undefined;
  return jar ?? { sets: [], clears: [] };
}

describe('POST /auth/login — Accept-Mode header', () => {
  let bundle: AuthenticationHttpBundle;

  beforeEach(() => {
    bundle = makeBundle();
  });

  it('legacy flow (no Accept-Mode): stages a Set-Cookie and returns tokens in body', async () => {
    const route = findRoute('POST', '/auth/login');
    const ctx = makeCtx({ body: { email: 'me@example.com', password: 'secret' } });
    const result = await route.handler(ctx, bundle);

    const jar = readCookieJar(ctx);
    expect(jar.sets.length).toBe(1);
    expect((jar.sets[0] as { name: string }).name).toBe('access_token');

    expect((result as { success: boolean }).success).toBe(true);
    expect((result as { data: { accessToken: string } }).data.accessToken).toBe('jwt-access');
  });

  it('Accept-Mode: cookie (explicit) behaves like legacy', async () => {
    const route = findRoute('POST', '/auth/login');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'cookie' },
      body: { email: 'me@example.com', password: 'secret' },
    });
    await route.handler(ctx, bundle);
    expect(readCookieJar(ctx).sets.length).toBe(1);
  });

  it('Accept-Mode: tokens does NOT stage a Set-Cookie', async () => {
    const route = findRoute('POST', '/auth/login');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'tokens' },
      body: { email: 'me@example.com', password: 'secret' },
    });
    const result = await route.handler(ctx, bundle);

    const jar = readCookieJar(ctx);
    expect(jar.sets.length).toBe(0);

    // Body still carries the tokens so the mobile client can store them.
    expect((result as { data: { accessToken: string } }).data.accessToken).toBe('jwt-access');
    expect((result as { data: { refreshToken: string } }).data.refreshToken).toBe('jwt-refresh');
    expect((result as { data: { expiresIn: number } }).data.expiresIn).toBe(900);
    expect((result as { data: { userId: string } }).data.userId).toBe('u-1');
  });

  it('Accept-Mode: tokens is case-insensitive', async () => {
    const route = findRoute('POST', '/auth/login');
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
    const route = findRoute('POST', '/auth/login');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'tokens' },
      body: { email: 'me@example.com', password: 'secret' },
    });
    const result = await route.handler(ctx, twofaBundle);

    expect((twofaBundle as unknown as MockBundle).createSession.execute).not.toHaveBeenCalled();
    expect((result as { data: { twoFactorRequired: boolean } }).data.twoFactorRequired).toBe(true);
  });
});

describe('POST /auth/login/verify-2fa — Accept-Mode header', () => {
  let bundle: AuthenticationHttpBundle;

  beforeEach(() => {
    bundle = makeBundle();
  });

  it('legacy flow stages Set-Cookie', async () => {
    const route = findRoute('POST', '/auth/login/verify-2fa');
    const ctx = makeCtx({ body: { userId: 'u-1', code: '123456' } });
    await route.handler(ctx, bundle);
    expect(readCookieJar(ctx).sets.length).toBe(1);
  });

  it('Accept-Mode: tokens does NOT stage Set-Cookie and returns tokens in body', async () => {
    const route = findRoute('POST', '/auth/login/verify-2fa');
    const ctx = makeCtx({
      headers: { 'accept-mode': 'tokens' },
      body: { userId: 'u-1', code: '123456' },
    });
    const result = await route.handler(ctx, bundle);

    expect(readCookieJar(ctx).sets.length).toBe(0);
    expect((result as { data: { accessToken: string } }).data.accessToken).toBe('jwt-access');
    expect((result as { data: { refreshToken: string } }).data.refreshToken).toBe('jwt-refresh');
  });
});
