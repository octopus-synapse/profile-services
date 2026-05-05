/**
 * E2E: 3-Stage Auth Gating
 *
 * Pins the contract that:
 *   - unverified users hit `403 missing email-verified` on protected routes
 *   - verified-but-not-onboarded users hit `403 missing onboarding-completed`
 *   - fully-onboarded users get through.
 *
 * Concurrent-safe: each `it` provisions its own fixture user (with
 * the appropriate pre-conditions via `freshInDbUser({ skipEmailVerify,
 * skipOnboarding })`), so two tests running in parallel never
 * mutate the same row.
 */

process.env.SKIP_EMAIL_VERIFICATION = 'false';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { freshInDbUser, stopTestApp, type TestApp } from '../../shared';
import { createE2ETestApp } from '../setup';

describe('E2E: 3-Stage Gating (verify + onboarding)', () => {
  let app: TestApp;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
  }, 60_000);

  afterAll(async () => {
    await stopTestApp();
  });

  describe('Stage 1 — fresh signup (unverified, not onboarded)', () => {
    it('session endpoint reports both gates open', async () => {
      const me = await freshInDbUser(app, { skipEmailVerify: true, skipOnboarding: true });
      const res = await app.request.get('/api/v1/auth/session').set(me.bearer());
      expect(res.status).toBe(200);
      expect(res.body.user.needsEmailVerification).toBe(true);
      expect(res.body.user.needsOnboarding).toBe(true);
    });

    it('returns 403 with `email-verified` missing on a protected endpoint', async () => {
      const me = await freshInDbUser(app, { skipEmailVerify: true, skipOnboarding: true });
      const res = await app.request.get('/api/v1/resumes').set(me.bearer());
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  describe('Stage 2 — verified but not onboarded', () => {
    it('clears the email gate but keeps onboarding pending', async () => {
      const me = await freshInDbUser(app, { skipOnboarding: true });
      const session = await app.request.get('/api/v1/auth/session').set(me.bearer());
      expect(session.body.user.needsEmailVerification).toBe(false);
      expect(session.body.user.needsOnboarding).toBe(true);
    });

    it('returns 403 with `onboarding-completed` missing on a protected endpoint', async () => {
      const me = await freshInDbUser(app, { skipOnboarding: true });
      const res = await app.request.get('/api/v1/resumes').set(me.bearer());
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ONBOARDING_NOT_COMPLETED');
    });

    it('session + onboarding endpoints stay reachable for verified-but-not-onboarded users', async () => {
      const me = await freshInDbUser(app, { skipOnboarding: true });
      const session = await app.request.get('/api/v1/auth/session').set(me.bearer());
      expect(session.status).toBe(200);
      const onboardingStatus = await app.request.get('/api/v1/onboarding/status').set(me.bearer());
      expect(onboardingStatus.status).toBe(200);
    });
  });

  describe('Stage 3 — fully onboarded', () => {
    it('unlocks protected endpoints once role is assigned + onboarding is complete', async () => {
      const me = await freshInDbUser(app);
      const res = await app.request
        .get('/api/v1/resumes')
        .set(me.bearer())
        .query({ page: 1, limit: 10 });
      expect(res.status).toBe(200);
    });
  });
});
