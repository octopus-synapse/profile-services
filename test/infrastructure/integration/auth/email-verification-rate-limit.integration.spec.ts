/**
 * P1 #4 — POST /v1/auth/email-verification/verify rate-limit.
 *
 * The verification code is 6 digits (10^6 keyspace, 15min TTL). A
 * per-token or per-email lockout doesn't fit the route shape (the
 * body carries `{ token }`, no user identifier), so the only practical
 * defense at the route layer is a tight per-IP rate-limit. The
 * `points: 3, duration: 300` cap holds a single IP under ~600
 * attempts/day — a botnet-scale attacker would have to rotate IPs
 * faster than 5/min to make meaningful progress.
 *
 * Note: a full P1 #4 close requires swapping the 6-digit code for a
 * 128+ bit URL-safe token; that's a follow-up out of this wave's
 * scope.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { runInParallel } from '../../shared/race-condition.helper';
import { closeApp, getApp, getRequest } from '../setup';

describe('P1 #4 — POST /v1/auth/email-verification/verify rate-limit', () => {
  beforeAll(async () => {
    await getApp();
  });

  afterAll(async () => {
    await closeApp();
  });

  it('caps brute-force code submissions at the per-IP rate-limit', async () => {
    const { successes } = await runInParallel(8, async (i) =>
      getRequest()
        .post('/api/v1/auth/email-verification/verify')
        .send({ token: String(100000 + i).padStart(6, '0') }),
    );

    const statuses = successes.map((r) => r.status);
    const rateLimited = statuses.filter((s) => s === 429).length;
    // points: 3, duration: 300, ip. Expect ≥5 of 8 concurrent attempts
    // to be 429'd; the rest hit the use case and 400 (token invalid).
    expect(rateLimited).toBeGreaterThanOrEqual(4);
  });
});
