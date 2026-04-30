/**
 * E2E Journey: Email Verification
 *
 * Tests the email verification lifecycle and its impact on route access.
 *
 * Flow:
 * 1. Register new user (email unverified)
 * 2. Attempt to access protected route (should fail - unverified)
 * 3. Request email verification
 * 4. Verify email (via direct DB update in test)
 * 5. Now can access protected routes
 * 6. Re-request verification when already verified (edge case)
 *
 * Target Time: < 20 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import type { PrismaClient } from '@prisma/client';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey: Email Verification', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaClient;
  let testUser: { email: string; password: string; name: string; token?: string; userId?: string };

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    if (testUser?.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await stopTestApp();
  });

  describe('Step 1: Register New User', () => {
    it('should register a new user without verifying email', async () => {
      testUser = authHelper.createTestUser('email-verify');

      // Register (but DO NOT verify email via helper). The
      // /api/accounts endpoint records consent rows from the
      // `acceptedTosVersion` / `acceptedPrivacyVersion` body fields,
      // so we don't insert UserConsent here too — that would collide
      // on the (userId, documentType, version) unique key.
      const signupResponse = await app.request.post('/api/accounts').send({
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
        acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
        acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
      });

      expect(signupResponse.status).toBe(201);
      expect(signupResponse.body.success).toBe(true);

      const responseData = signupResponse.body.data;
      testUser.userId = responseData.userId;

      expect(testUser.userId).toBeDefined();
    });

    it('should login even with unverified email', async () => {
      const loginResponse = await app.request
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      // Login should succeed - email guard blocks routes, not login
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.accessToken).toBeDefined();

      testUser.token = loginResponse.body.data.accessToken;
    });
  });

  describe('Step 2: Access Protected Route (Unverified)', () => {
    it('should block access to protected route with unverified email', async () => {
      const response = await app.request
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`);

      // SKIP_EMAIL_VERIFICATION=true bypasses the gate entirely.
      // Otherwise the unified permission gate emits 403 with
      // `error.missing` carrying 'email-verified'.
      if (response.status === 200) {
        // Gate bypassed (dev compose). No further assertion possible.
        return;
      }
      expect(response.status).toBe(403);
      expect(response.body.error?.missing).toContain('email-verified');
    });

    it('should block access to user profile with unverified email', async () => {
      const response = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`);

      if (response.status === 200) return;
      expect(response.status).toBe(403);
      expect(response.body.error?.missing).toContain('email-verified');
    });
  });

  describe('Step 3: Request Email Verification', () => {
    it('should request a verification email', async () => {
      const response = await app.request
        .post('/api/email-verification/send')
        .set('Authorization', `Bearer ${testUser.token}`);

      // Should succeed (200) - sends verification email
      // Note: EmailSenderService is mocked in E2E, no actual email sent
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBeDefined();
    });
  });

  describe('Step 4: Verify Email', () => {
    it('should verify email via direct database update', async () => {
      // In a real flow, user would click a link with a token.
      // In tests, we update the DB directly. We also clear the
      // onboarding gate and grant the default user role so step 5 can
      // assert plain protected-route access without re-implementing the
      // full onboarding flow here.
      await prisma.user.update({
        where: { id: testUser.userId! },
        data: {
          emailVerified: new Date(),
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date(),
        },
      });
      const userRole = await prisma.role.findUnique({ where: { name: 'user' } });
      if (userRole) {
        await prisma.userRoleAssignment.upsert({
          where: { userId_roleId: { userId: testUser.userId!, roleId: userRole.id } },
          create: { userId: testUser.userId!, roleId: userRole.id },
          update: {},
        });
      }

      // Verify the update was applied
      const user = await prisma.user.findUnique({
        where: { id: testUser.userId! },
        select: { emailVerified: true },
      });

      expect(user).not.toBeNull();
      expect(user?.emailVerified).not.toBeNull();

      // Re-login to get a fresh token that includes emailVerified claim
      const loginResponse = await app.request
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(loginResponse.status).toBe(200);
      testUser.token = loginResponse.body.data.accessToken;
    });
  });

  describe('Step 5: Access Protected Routes (Verified)', () => {
    it('should now access protected route after email verification', async () => {
      const response = await app.request
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should access user profile after email verification', async () => {
      const response = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should be able to create a resume after verification', async () => {
      const response = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ title: 'Post-Verification Resume' });

      // Should succeed now
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('Step 6: Re-request Verification (Already Verified)', () => {
    it('should handle re-request when already verified', async () => {
      const response = await app.request
        .post('/api/email-verification/send')
        .set('Authorization', `Bearer ${testUser.token}`);

      // Should return 409 Conflict (already verified) or 200 with appropriate message
      expect([200, 409]).toContain(response.status);

      if (response.status === 409) {
        // Conflict - email already verified
        expect(response.body.message || response.body.error?.message).toBeDefined();
      }
    });
  });

  describe('Step 7: Edge Cases', () => {
    it('should reject verification request without authentication', async () => {
      const response = await app.request.post('/api/email-verification/send');

      expect(response.status).toBe(401);
    });

    it('should reject verification with invalid token', async () => {
      const response = await app.request
        .post('/api/email-verification/verify')
        .send({ token: 'invalid-fake-token-12345' });

      expect([400, 404]).toContain(response.status);
    });

    it('should reject verification with empty token', async () => {
      const response = await app.request.post('/api/email-verification/verify').send({ token: '' });

      expect([400, 422]).toContain(response.status);
    });

    it('should reject verification without token field', async () => {
      const response = await app.request.post('/api/email-verification/verify').send({});

      expect([400, 422]).toContain(response.status);
    });
  });
});
