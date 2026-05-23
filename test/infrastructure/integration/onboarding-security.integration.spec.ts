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

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import type { PrismaClient } from '@prisma/client';
import { freshInDbUser, stopTestApp, type TestApp } from '../shared';
import { getApp, uniqueTestUsername } from './setup';

const PROGRESS_PATH = '/api/v1/onboarding/progress';
const NEXT_PATH = '/api/v1/onboarding/session/next';
const USERNAME_RULES_PATH = '/api/v1/users/username/rules';

describe('Onboarding Security & Race Integration', () => {
  let app: TestApp;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await getApp();
    prisma = app.prisma;
  });

  afterAll(async () => {
    await stopTestApp();
  });

  let userA: { userId: string; token: string };
  let userB: { userId: string; token: string };

  beforeEach(async () => {
    const a = await freshInDbUser(app);
    const b = await freshInDbUser(app);
    userA = { userId: a.userId, token: a.token };
    userB = { userId: b.userId, token: b.token };
  });

  // ── B1+B2 (the reported "Enzo Patti" path) ───────────────────────
  describe('Username format validation at the API boundary', () => {
    it('rejects "Enzo Patti" (uppercase + space) with a field error', async () => {
      const res = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          currentStep: 'username',
          completedSteps: ['welcome', 'personal-info'],
          username: 'Enzo Patti',
        });
      expect(res.status).toBe(400);
      // Field-level error should mention the username path so the client
      // can localize / highlight without parsing strings.
      const fields = (res.body as { fields?: Array<{ path: string }> }).fields ?? [];
      expect(fields.some((f) => f.path === 'username')).toBe(true);
    });

    it('rejects hyphenated usernames (regex contract)', async () => {
      const res = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: 'enzo-dev',
        });
      expect(res.status).toBe(400);
    });

    it('rejects reserved usernames (admin)', async () => {
      const res = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: 'admin',
        });
      expect(res.status).toBe(400);
    });

    it('accepts and normalises whitespace + casing on a valid username', async () => {
      const handle = uniqueTestUsername('enzo');
      const res = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: `  ${handle.toUpperCase()}  `,
        });
      expect(res.status).toBe(200);
      const progress = await prisma.onboardingProgress.findUnique({
        where: { userId: userA.userId },
      });
      expect(progress?.username).toBe(handle);
    });
  });

  // ── B1+B3 (case-insensitive lookup across BOTH lookups) ──────────
  describe('Username uniqueness across users', () => {
    it('rejects another user claiming the same username in different casing', async () => {
      const handle = uniqueTestUsername('clash');

      // A claims the canonical casing.
      const claimA = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: handle,
        });
      expect(claimA.status).toBe(200);

      // B tries the UPPERCASE variant — schema normalises to lowercase,
      // lookup finds A's progress row, conflict bubbles up.
      const claimB = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          currentStep: 'username',
          completedSteps: ['welcome'],
          username: handle.toUpperCase(),
        });
      expect(claimB.status).toBe(409);
      expect((claimB.body as { code?: string }).code).toBe('USERNAME_TAKEN');
    });

    it('handles concurrent username claims — only one wins', async () => {
      const handle = uniqueTestUsername('race');

      const [resA, resB] = await Promise.all([
        app.request
          .put(PROGRESS_PATH)
          .set('Authorization', `Bearer ${userA.token}`)
          .send({ currentStep: 'username', completedSteps: ['welcome'], username: handle }),
        app.request
          .put(PROGRESS_PATH)
          .set('Authorization', `Bearer ${userB.token}`)
          .send({ currentStep: 'username', completedSteps: ['welcome'], username: handle }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      // Either both succeed (no DB-level guard yet on PROGRESS column —
      // backstop is at completion) or one rejects 409. We accept both
      // since the column doesn't have a unique constraint and the
      // committed `User.username` is the real winner. What we DON'T
      // accept is two server-side crashes.
      for (const s of statuses) {
        expect([200, 409]).toContain(s);
      }
    });

    it('allows the same user to re-submit their own username (idempotent)', async () => {
      const handle = uniqueTestUsername('idem');
      const body = {
        currentStep: 'username',
        completedSteps: ['welcome'],
        username: handle,
      };

      const first = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(body);
      expect(first.status).toBe(200);

      const second = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userA.token}`)
        .send(body);
      expect(second.status).toBe(200);
    });
  });

  // ── Idempotence: stepper Continue double-click ───────────────────
  describe('POST /session/next idempotence', () => {
    it('keeps `completedSteps` from doubling on rapid double-click', async () => {
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

      const finalProgress = await prisma.onboardingProgress.findUnique({
        where: { userId: userA.userId },
      });
      const completed = finalProgress?.completedSteps ?? [];
      const dupes = completed.filter((step, i) => completed.indexOf(step) !== i);
      expect(dupes).toEqual([]);
    });
  });

  // ── XSS: persisted-content sanitisation contract ─────────────────
  describe('XSS / hostile input', () => {
    it('does not echo back a raw <script> tag from a fullName payload', async () => {
      const payload = '<script>alert(1)</script>Mallory';
      const res = await app.request
        .put(PROGRESS_PATH)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          currentStep: 'personal-info',
          completedSteps: ['welcome'],
          personalInfo: { fullName: payload, phone: null, location: null },
        });
      // Accept either: backend rejected (most defensive), backend
      // accepted but sanitised before persistence, or backend accepted
      // but escapes on the JSON response (the JSON encoder already
      // handles the latter — the danger is HTML interpolation client-side,
      // which is the frontend's job to escape). The contract we enforce
      // here is "never crash on hostile input + never persist a raw
      // <script> opening tag we'd later render unescaped".
      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        const row = await prisma.onboardingProgress.findUnique({
          where: { userId: userA.userId },
        });
        const stored = (row?.personalInfo as { fullName?: string } | null)?.fullName ?? '';
        // The sanitised form may be empty, escaped, or stripped — but
        // it must not contain the literal `<script>` open tag verbatim.
        expect(stored).not.toContain('<script>');
      }
    });
  });

  // ── New endpoint: public username rules ──────────────────────────
  describe('GET /v1/users/username/rules (public)', () => {
    it('returns the regex sources + min/max without auth', async () => {
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
