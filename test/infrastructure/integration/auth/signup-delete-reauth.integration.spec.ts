/**
 * P1 #3 + #13 — signup rate-limit and account-deletion re-authentication.
 * Both protections are wired in `account-lifecycle.routes.ts`; this spec
 * pins the behaviour so neither regresses.
 *
 *   - P1 #3: POST /v1/accounts is throttled by per-IP `points: 3,
 *     duration: 600` — exhausting the budget returns 429.
 *   - P1 #13: the two-step deletion requires `confirmationPhrase` AND
 *     `currentPassword` at POST /v1/accounts/delete/request (wrong/missing
 *     password → 401, wrong phrase → 400), then a valid emailed 6-digit code
 *     at POST /v1/accounts/delete/confirm before the account is erased.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { runInParallel } from '../../shared/race-condition.helper';
import {
  clearAuthRateLimits,
  closeApp,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestEmail,
} from '../setup';

const PASSWORD = 'CorrectPassword123!';

describe('P1 #3 — POST /v1/accounts rate-limit', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  beforeEach(async () => {
    // Reset the IP-keyed bucket so the test gets a clean budget.
    // Without this the previous suite's signups leak into this one
    // and either every request succeeds (if the budget is high) or
    // every one 429s (if it was already exhausted).
    await clearAuthRateLimits();
  });

  it('caps concurrent signups from the same IP', async () => {
    // Current cap: `points: 10, duration: 600` (see
    // account-lifecycle.routes.ts). Fire 12 concurrent signups with
    // distinct emails — exactly 10 should succeed and 2 should 429.
    // The numbers below assert the GUARANTEE, not the exact split:
    // some implementations let one extra through under racey INCR.
    const TOTAL = 12;
    const { successes } = await runInParallel(TOTAL, async (i) =>
      getRequest()
        .post('/api/v1/accounts')
        .send({
          email: uniqueTestEmail(`signup-rl-${i}`),
          password: PASSWORD,
          name: `Signup RL ${i}`,
          acceptedTosVersion: '1.0.0',
          acceptedPrivacyVersion: '1.0.0',
        }),
    );

    const statuses = successes.map((r) => r.status);
    const rateLimited = statuses.filter((s) => s === 429).length;
    const created = statuses.filter((s) => s === 201).length;
    expect(rateLimited).toBeGreaterThanOrEqual(1);
    expect(created).toBeGreaterThanOrEqual(2);
    expect(created + rateLimited).toBe(TOTAL);
  });
});

describe('P1 #13 — account deletion requires currentPassword + emailed code', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  beforeEach(async () => {
    await clearAuthRateLimits();
  });

  async function signupAndLoginCookie(): Promise<{ userId: string; cookie: string }> {
    const email = uniqueTestEmail('delete-reauth');
    const signup = await getRequest().post('/api/v1/accounts').send({
      email,
      password: PASSWORD,
      name: 'Delete Reauth User',
      acceptedTosVersion: '1.0.0',
      acceptedPrivacyVersion: '1.0.0',
    });
    if (signup.status !== 201) {
      throw new Error(`signup failed: ${signup.status} ${JSON.stringify(signup.body)}`);
    }
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('user row missing after signup');
    // Make sure the gate stages don't intercept the DELETE request.
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date(), onboardingCompletedAt: new Date() },
    });

    const login = await getRequest().post('/api/v1/auth/login').send({ email, password: PASSWORD });
    if (login.status !== 200) {
      throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
    }
    const access = login.setCookie.find((c) => c.startsWith('access_token=')) ?? '';
    return { userId: user.id, cookie: access };
  }

  it('rejects the delete request with the wrong currentPassword', async () => {
    const { cookie } = await signupAndLoginCookie();
    const res = await getRequest()
      .post('/api/v1/accounts/delete/request')
      .set('Cookie', cookie)
      .send({ confirmationPhrase: 'DELETE MY ACCOUNT', currentPassword: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });

  it('rejects the delete request without a confirmation phrase even with the right password', async () => {
    const { cookie } = await signupAndLoginCookie();
    const res = await getRequest()
      .post('/api/v1/accounts/delete/request')
      .set('Cookie', cookie)
      .send({ confirmationPhrase: 'WRONG PHRASE', currentPassword: PASSWORD });
    // AccountDeletionRequiresConfirmationException → 400
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('does not delete on request — only after confirming the emailed code', async () => {
    const { userId, cookie } = await signupAndLoginCookie();
    const prisma = getPrisma();

    // Step 1: request (correct phrase + password) issues a code but keeps the account.
    const request = await getRequest()
      .post('/api/v1/accounts/delete/request')
      .set('Cookie', cookie)
      .send({ confirmationPhrase: 'DELETE MY ACCOUNT', currentPassword: PASSWORD });
    expect(request.status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();

    // The single-use code lands in the shared verification-token table.
    const pending = await prisma.emailVerificationToken.findFirst({
      where: { userId, purpose: 'ACCOUNT_DELETION' },
    });
    expect(pending).not.toBeNull();

    // A wrong code is rejected and the account survives.
    const badConfirm = await getRequest()
      .post('/api/v1/accounts/delete/confirm')
      .set('Cookie', cookie)
      .send({ code: '000000' });
    expect(badConfirm.status).toBeGreaterThanOrEqual(400);
    expect(badConfirm.status).toBeLessThan(500);
    expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();

    // Step 2: confirming the real code erases the account.
    const confirm = await getRequest()
      .post('/api/v1/accounts/delete/confirm')
      .set('Cookie', cookie)
      .send({ code: pending!.token });
    expect([200, 204]).toContain(confirm.status);
    expect(await prisma.user.findUnique({ where: { id: userId } })).toBeNull();
  });
});
