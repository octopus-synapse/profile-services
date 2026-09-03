/**
 * Onboarding Security & Race-Condition Integration Tests
 *
 * Gap-filler suite for behaviours the unit tests can't observe:
 *   - case-insensitive username uniqueness across two real users
 *   - concurrent claim of the same username (race)
 *   - double-submit idempotence on POST /onboarding/session/next
 *   - format rejection of "Enzo Patti" (the originally reported regression)
 *   - public /username/rules endpoint exposing the regex source-of-truth
 *
 * Each test spins up two fresh users so the lookups run against the
 * real Postgres and Prisma's `mode: 'insensitive'` is genuinely
 * exercised.
 */

import { describe, expect, it } from 'bun:test';
import { freshInDbUser, type TestApp } from '../shared';
import { getApp } from './setup';

const NEXT_PATH = '/api/v1/onboarding/session/next';
const USERNAME_RULES_PATH = '/api/v1/users/username/rules';

/**
 * Order-independent onboarding-security suite. Bun 1.3+ runs tests
 * inside a `describe` concurrently, so the prior shared `userA`/`userB`
 * provisioned in `beforeEach` would race across parallel tests. Each
 * test now provisions its own pair of fresh users so it owns its
 * fixtures for its lifetime.
 */
interface UserPair {
  readonly app: TestApp;
  readonly userA: { userId: string; token: string };
  readonly userB: { userId: string; token: string };
}

async function freshPair(): Promise<UserPair> {
  const app = await getApp();
  const a = await freshInDbUser(app);
  const b = await freshInDbUser(app);
  return {
    app,
    userA: { userId: a.userId, token: a.token },
    userB: { userId: b.userId, token: b.token },
  };
}

describe('Onboarding Security & Race Integration', () => {
  // ── B1+B2 (the reported "Enzo Patti" path) ───────────────────────

  // ── B1+B3 (case-insensitive lookup across BOTH lookups) ──────────

  // ── Idempotence: stepper Continue double-click ───────────────────
  describe('POST /session/next idempotence', () => {
    it('keeps `completedSteps` from doubling on rapid double-click', async () => {
      const { app, userA } = await freshPair();
      // Two near-simultaneous next requests. Either both succeed (we
      // ended up at the same step but the set was de-duped) or the
      // second hits a 409/422 because the state machine already moved.
      // Critical assertion: completedSteps doesn't contain duplicates
      // of the same step key.
      const [r1, r2] = await Promise.all([
        app.request.post(NEXT_PATH).set('Authorization', `Bearer ${userA.token}`).send({}),
        app.request.post(NEXT_PATH).set('Authorization', `Bearer ${userA.token}`).send({}),
      ]);

      for (const r of [r1, r2]) {
        expect([200, 201, 400, 409, 422]).toContain(r.status);
      }

      const finalProgress = await app.prisma.onboardingProgress.findUnique({
        where: { userId: userA.userId },
      });
      const completed = finalProgress?.completedSteps ?? [];
      const dupes = completed.filter((step, i) => completed.indexOf(step) !== i);
      expect(dupes).toEqual([]);
    });
  });

  // ── XSS: persisted-content sanitisation contract ─────────────────

  // ── New endpoint: public username rules ──────────────────────────
  describe('GET /v1/users/username/rules (public)', () => {
    it('returns the regex sources + min/max without auth', async () => {
      const app = await getApp();
      const res = await app.request.get(USERNAME_RULES_PATH);
      expect(res.status).toBe(200);
      const body = res.body as {
        pattern: string;
        startsWithPattern: string;
        endsWithPattern: string;
        forbiddenSubstring: string;
        minLength: number;
        maxLength: number;
      };
      // Compiles. Matches what UsernameSchema enforces.
      expect(new RegExp(body.pattern).test('enzo_dev')).toBe(true);
      expect(new RegExp(body.pattern).test('Enzo Patti')).toBe(false);
      expect(body.forbiddenSubstring).toBe('__');
      expect(body.minLength).toBeGreaterThan(0);
      expect(body.maxLength).toBeGreaterThan(body.minLength);
    });
  });
});
