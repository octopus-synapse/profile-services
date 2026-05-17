/**
 * P1 #2 + #12 — login + verify-2fa rate-limit and lockout integration
 * specs. Exercises the route-level guards declared in
 * `authentication.routes.ts`:
 *   - `{ id: 'rate-limit', metadata: { points: 10, duration: 60, keyStrategy: 'ip' } }`
 *     → 429 after 10 attempts/minute from the same IP.
 *   - `{ id: 'auth-lockout', metadata: { keyStrategy: 'email' } }`
 *     → 423 + Retry-After once the email is locked.
 *
 * The integration harness runs against the real Elysia bootstrap so
 * these assertions validate the full pipeline (rate-limit stage →
 * auth-lockout stage → use-case lockout check → password compare).
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { runInParallel } from '../../shared/race-condition.helper';
import { closeApp, getApp, getPrisma, getRequest, uniqueTestEmail } from '../setup';

const VALID_PASSWORD = 'CorrectPassword123!';
const WRONG_PASSWORD = 'WrongPassword123!';

async function signupVerified(email: string): Promise<string> {
  const prisma = getPrisma();
  const res = await getRequest().post('/api/v1/accounts').send({
    email,
    password: VALID_PASSWORD,
    name: 'Lockout Test User',
    acceptedTosVersion: '1.0.0',
    acceptedPrivacyVersion: '1.0.0',
  });
  if (res.status >= 400) {
    throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('user row missing after signup');
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
  return user.id;
}

describe('P1 #2 — POST /v1/auth/login rate-limit + lockout', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('caps concurrent login attempts at the per-IP rate-limit (10/minute)', async () => {
    const email = uniqueTestEmail('login-ratelimit');
    await signupVerified(email);

    // Fire 15 concurrent attempts with the wrong password from the
    // same IP. The rate-limit guard is `points: 10, duration: 60s, ip` →
    // exactly 10 should pass through to the auth layer (and 401), the
    // other 5 should bounce at the pipeline with 429.
    const { successes } = await runInParallel(15, async () =>
      getRequest().post('/api/v1/auth/login').send({ email, password: WRONG_PASSWORD }),
    );

    const statuses = successes.map((r) => r.status);
    const rateLimited = statuses.filter((s) => s === 429).length;
    const passedThrough = statuses.filter((s) => s === 401 || s === 423).length;

    // INCR-backed limiter guarantees exactly `limit` get through. Allow
    // a tiny tolerance for clock-skew edge cases that hand 11 through
    // when the next minute window rolls during the test.
    expect(rateLimited).toBeGreaterThanOrEqual(4);
    expect(rateLimited).toBeLessThanOrEqual(6);
    expect(passedThrough).toBeGreaterThanOrEqual(9);
    expect(rateLimited + passedThrough).toBe(15);
  });

  it('locks the email after the configured failure threshold and emits 423 + Retry-After', async () => {
    const email = uniqueTestEmail('login-lockout');
    await signupVerified(email);

    // LOGIN_MAX_FAILED_ATTEMPTS defaults to 5. Submit 6 sequential
    // wrong-password attempts to cross the threshold + trigger the
    // lockout. The 6th (or any subsequent) request to the login route
    // should be rejected by the auth-lockout stage with 423.
    for (let i = 0; i < 6; i++) {
      await getRequest()
        .post('/api/v1/auth/login')
        .set('X-E2E-Bypass-Rate-Limit', 'true')
        .send({ email, password: WRONG_PASSWORD });
    }

    const locked = await getRequest()
      .post('/api/v1/auth/login')
      .set('X-E2E-Bypass-Rate-Limit', 'true')
      .send({ email, password: WRONG_PASSWORD });

    expect(locked.status).toBe(423);
    const body = locked.body as { error?: { code?: string; params?: { retryAfter?: number } } };
    // Stage emits the typed envelope; depending on response wrapper
    // either { error: { code, params } } or { code, params } reaches the
    // body. Assert on the code only — wrapper shape is covered by other
    // contract tests.
    const code =
      (body.error?.code as string | undefined) ?? (body as unknown as { code?: string }).code ?? '';
    expect(code).toContain('LOCKED');
    expect(locked.headers.get('retry-after')).not.toBeNull();
  });
});
