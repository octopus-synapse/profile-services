/**
 * P1 #5 — POST /v1/auth/reset-password rate-limit.
 *
 * The reset token itself is a 256-bit sha256-hashed value so brute-
 * forcing it is infeasible. The IP cap here exists to throttle DoS:
 * each call hits the DB then re-hashes the new password with bcrypt
 * cost 12 (~80ms CPU per request). A 5/hour cap holds CPU spend per
 * attacker IP to well under 1 vCPU·second/min even with maximum
 * parallelism.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { runInParallel } from '../../shared/race-condition.helper';
import { closeApp, getApp, getRequest } from '../setup';

describe('P1 #5 — POST /v1/auth/reset-password rate-limit', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('caps reset-password attempts per IP', async () => {
    const { successes } = await runInParallel(8, async () =>
      getRequest()
        .post('/api/v1/auth/reset-password')
        .send({ token: 'invalid-token-fixture', newPassword: 'SecurePass!9912' }),
    );

    const statuses = successes.map((r) => r.status);
    const rateLimited = statuses.filter((s) => s === 429).length;
    // points: 5, duration: 3600, ip. Expect ≥3 of 8 concurrent attempts
    // to bounce at the pipeline; the rest hit the use case and 400.
    expect(rateLimited).toBeGreaterThanOrEqual(3);
  });
});
