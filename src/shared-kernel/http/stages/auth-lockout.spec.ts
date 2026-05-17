import { describe, expect, it } from 'bun:test';
import type { HttpCtx } from '../context';
import type { Route } from '../route.types';
import {
  type AuthLockoutStatus,
  authLockoutStage,
  type LoginAttemptsLookup,
} from './auth-lockout.stage';

interface StubCalls {
  readonly keys: string[];
}

function buildLookup(
  status: AuthLockoutStatus,
  calls: StubCalls = { keys: [] },
): LoginAttemptsLookup {
  return {
    async getLockStatus(key: string): Promise<AuthLockoutStatus> {
      (calls.keys as string[]).push(key);
      return status;
    },
  };
}

function buildRoute(meta?: Record<string, unknown>): Route {
  return {
    method: 'POST',
    path: '/v1/auth/login',
    auth: { kind: 'public' },
    guards: [{ id: 'auth-lockout', metadata: meta ?? { keyStrategy: 'email' } }],
    openapi: { summary: 'login', tags: ['auth'] },
    handler: async () => ({}),
  } as Route;
}

function buildCtx(overrides: Partial<HttpCtx> = {}): HttpCtx {
  return {
    method: 'POST',
    path: '/v1/auth/login',
    headers: {},
    cookies: {},
    body: {},
    query: {},
    params: {},
    user: null,
    state: {},
    ...overrides,
  } as HttpCtx;
}

describe('authLockoutStage', () => {
  it('is a no-op when the route does not declare the guard', async () => {
    const calls: StubCalls = { keys: [] };
    const stage = authLockoutStage({
      attempts: buildLookup({ locked: true, resetInSeconds: 60 }, calls),
    });
    const ctx = buildCtx({
      state: {
        __route: {
          method: 'POST',
          path: '/v1/auth/login',
          auth: { kind: 'public' },
          openapi: { summary: 's', tags: [] },
          handler: async () => ({}),
        } as Route,
      },
    });
    let nextCalled = false;
    await stage.run(ctx, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(calls.keys).toEqual([]);
    expect(ctx.state.responseStatus).toBeUndefined();
  });

  it('passes through when the lookup reports unlocked', async () => {
    const calls: StubCalls = { keys: [] };
    const stage = authLockoutStage({
      attempts: buildLookup({ locked: false, resetInSeconds: null }, calls),
    });
    const ctx = buildCtx({
      body: { email: 'alice@example.com' },
      state: { __route: buildRoute() },
    });
    let nextCalled = false;
    await stage.run(ctx, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(calls.keys).toEqual(['alice@example.com']);
    expect(ctx.state.responseStatus).toBeUndefined();
  });

  it('returns 423 with Retry-After when locked', async () => {
    const stage = authLockoutStage({
      attempts: buildLookup({ locked: true, resetInSeconds: 42 }),
    });
    const ctx = buildCtx({
      body: { email: 'alice@example.com' },
      state: { __route: buildRoute() },
    });
    let nextCalled = false;
    await stage.run(ctx, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(false);
    expect(ctx.state.responseStatus).toBe(423);
    const body = ctx.state.responseBody as { code: string; params: { retryAfter: number } };
    expect(body.code).toBe('ACCOUNT_LOCKED');
    expect(body.params.retryAfter).toBe(42);
    const headers = ctx.state.responseHeaders as Record<string, string>;
    expect(headers['Retry-After']).toBe('42');
  });

  it('normalizes the email key (trim + lowercase)', async () => {
    const calls: StubCalls = { keys: [] };
    const stage = authLockoutStage({
      attempts: buildLookup({ locked: false, resetInSeconds: null }, calls),
    });
    const ctx = buildCtx({
      body: { email: '  Alice@Example.COM  ' },
      state: { __route: buildRoute() },
    });
    await stage.run(ctx, async () => {});
    expect(calls.keys).toEqual(['alice@example.com']);
  });

  it('uses ctx.ip for keyStrategy=ip', async () => {
    const calls: StubCalls = { keys: [] };
    const stage = authLockoutStage({
      attempts: buildLookup({ locked: false, resetInSeconds: null }, calls),
    });
    const ctx = buildCtx({
      ip: '1.2.3.4',
      body: { email: 'ignored@example.com' },
      state: { __route: buildRoute({ keyStrategy: 'ip' }) },
    });
    await stage.run(ctx, async () => {});
    expect(calls.keys).toEqual(['1.2.3.4']);
  });

  it('no-ops when the body has no email field', async () => {
    const calls: StubCalls = { keys: [] };
    const stage = authLockoutStage({
      attempts: buildLookup({ locked: true, resetInSeconds: 60 }, calls),
    });
    const ctx = buildCtx({
      body: { somethingElse: 'x' },
      state: { __route: buildRoute() },
    });
    let nextCalled = false;
    await stage.run(ctx, async () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(calls.keys).toEqual([]);
  });

  it('caps Retry-After at >= 1 second', async () => {
    const stage = authLockoutStage({
      attempts: buildLookup({ locked: true, resetInSeconds: 0 }),
    });
    const ctx = buildCtx({
      body: { email: 'a@b.com' },
      state: { __route: buildRoute() },
    });
    await stage.run(ctx, async () => {});
    const headers = ctx.state.responseHeaders as Record<string, string>;
    expect(headers['Retry-After']).toBe('1');
  });
});
