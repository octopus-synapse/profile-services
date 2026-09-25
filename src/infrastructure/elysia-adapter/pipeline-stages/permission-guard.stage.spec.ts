import { describe, expect, it } from 'bun:test';
import type { HttpCtx } from '@/shared-kernel/http/context';
import type { Route } from '@/shared-kernel/http/route.types';
import { permissionGuardStage } from './permission-guard.stage';

function context(method: string, path: string): HttpCtx {
  const route = {
    method,
    path,
    auth: { kind: 'jwt' },
    openapi: { summary: 'test', tags: [] },
    handler: async () => ({}),
  } as Route;
  return {
    method,
    path,
    headers: {},
    cookies: {},
    ip: undefined,
    userAgent: undefined,
    body: {},
    query: {},
    params: {},
    user: {
      userId: 'new-user',
      email: 'new@example.test',
      emailVerified: true,
      hasCompletedOnboarding: false,
    },
    state: { __route: route },
  };
}

describe('permissionGuardStage during onboarding', () => {
  const stage = permissionGuardStage({ check: async () => true });

  it('allows checkout creation and status, but not the rest of billing', async () => {
    for (const [method, path] of [
      ['POST', '/v1/billing/checkouts'],
      ['GET', '/v1/billing/checkouts/:id'],
      ['POST', '/v1/billing/checkouts/:id/card'],
      ['GET', '/v1/billing/subscription'],
    ]) {
      const ctx = context(method!, path!);
      let passed = false;
      await stage.run(ctx, async () => {
        passed = true;
      });
      expect(passed).toBe(true);
    }
    const cancel = context('POST', '/v1/billing/subscription/cancel');
    await stage.run(cancel, async () => undefined);
    expect(cancel.state.responseStatus).toBe(403);
  });

  it('continues to deny profile access until onboarding completes', async () => {
    const ctx = context('GET', '/v1/users/profile');
    await stage.run(ctx, async () => undefined);
    expect(ctx.state.responseStatus).toBe(403);
    expect((ctx.state.responseBody as { code: string }).code).toBe('ONBOARDING_NOT_COMPLETED');
  });
});
