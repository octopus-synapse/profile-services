/**
 * E2E Journey: 3-Stage Auth Gating (signup → verify-email → onboarding → app)
 *
 * Pins the contract that a user without a verified email can't reach any
 * protected endpoint except the handful explicitly marked with
 * `@AllowUnverifiedEmail()` / `@AllowIncompleteOnboarding()`. After
 * verifying, they still hit `403 ONBOARDING_NOT_COMPLETED` until the
 * onboarding flow completes.
 *
 * Runs with `SKIP_EMAIL_VERIFICATION=false` so the `EmailVerifiedGuard`
 * actually enforces (the default in dev/prod). The existing
 * `email-verification.spec.ts` covers the SKIP=true codepath.
 */

// Flip BEFORE the app is built — guards read the env in their constructor.
process.env.SKIP_EMAIL_VERIFICATION = 'false';

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: 3-Stage Gating (verify + onboarding)', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaService;
  let user: { email: string; password: string; name: string; userId?: string; token?: string };

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;
  }, 60_000);

  afterAll(async () => {
    if (user?.email) await cleanupHelper.deleteUserByEmail(user.email);
    await app.close();
  });

  describe('Stage 1 — fresh signup (unverified, not onboarded)', () => {
    it('creates the account and logs in without verifying', async () => {
      user = authHelper.createTestUser('three-stage');

      const signup = await request(app.getHttpServer())
        .post('/api/accounts')
        .send({ email: user.email, password: user.password, name: user.name });
      expect(signup.status).toBe(201);
      user.userId = signup.body.data.userId;

      await prisma.userConsent.createMany({
        data: [
          {
            userId: user.userId!,
            documentType: 'TERMS_OF_SERVICE',
            version: '1.0.0',
            acceptedAt: new Date(),
          },
          {
            userId: user.userId!,
            documentType: 'PRIVACY_POLICY',
            version: '1.0.0',
            acceptedAt: new Date(),
          },
        ],
      });

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });
      expect(login.status).toBe(200);
      user.token = login.body.data.accessToken;
    });

    it('session endpoint reports needsEmailVerification:true, needsOnboarding:true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${user.token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.needsEmailVerification).toBe(true);
      expect(res.body.data.user.needsOnboarding).toBe(true);
    });

    it('returns 403 EMAIL_NOT_VERIFIED on a protected endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${user.token}`);
      expect(res.status).toBe(403);
      // EmailVerifiedGuard throws EmailNotVerifiedException — shape asserts on message key.
      expect(String(res.body.message ?? '')).toMatch(/verified|verificad/i);
    });
  });

  describe('Stage 2 — verified but not onboarded', () => {
    it('accepting the verification token clears email gate', async () => {
      await prisma.user.update({
        where: { id: user.userId! },
        data: { emailVerified: new Date() },
      });

      // Re-login so the JWT's emailVerified / hasCompletedOnboarding claims refresh.
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });
      expect(login.status).toBe(200);
      user.token = login.body.data.accessToken;

      const session = await request(app.getHttpServer())
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${user.token}`);
      expect(session.body.data.user.needsEmailVerification).toBe(false);
      expect(session.body.data.user.needsOnboarding).toBe(true);
    });

    it('returns 403 ONBOARDING_NOT_COMPLETED on a protected endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${user.token}`);
      expect(res.status).toBe(403);
      expect(res.body.code ?? res.body.message?.code).toBe('ONBOARDING_NOT_COMPLETED');
    });

    it('session + onboarding endpoints stay reachable (whitelisted)', async () => {
      const session = await request(app.getHttpServer())
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${user.token}`);
      expect(session.status).toBe(200);

      const onboardingStatus = await request(app.getHttpServer())
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${user.token}`);
      expect(onboardingStatus.status).toBe(200);
    });
  });

  describe('Stage 3 — onboarding complete', () => {
    it('flipping hasCompletedOnboarding unlocks protected endpoints', async () => {
      await prisma.user.update({
        where: { id: user.userId! },
        data: { hasCompletedOnboarding: true, onboardingCompletedAt: new Date() },
      });

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: user.email, password: user.password });
      user.token = login.body.data.accessToken;

      const res = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${user.token}`)
        .query({ page: 1, limit: 10 });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
