/**
 * E2E Test: Complete User Lifecycle Journey
 *
 * Tests the critical path from signup to public resume viewing.
 * This validates the core value proposition of the platform.
 *
 * Flow:
 * 1. Account Creation with email verification and ToS acceptance
 * 2. Onboarding Completion
 * 3. Resume Verification
 * 4. Share Creation
 * 5. Public Resume Access
 * 6. Share Deletion
 *
 * Response Formats (based on integration tests):
 * - Shares POST: returns { slug, resumeId, isActive, publicUrl } directly
 * - Shares GET list: returns array directly
 * - Resume GET: returns { data: { id, experiences, education, skills } }
 *
 * Target Time: < 30 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import { createMinimalOnboardingData } from '../fixtures/resumes.fixture';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey 1: Complete User Lifecycle', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: { email: string; password: string; name: string; token?: string; userId?: string };
  let resumeId: string;
  let shareSlug: string;
  let shareId: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
  });

  afterAll(async () => {
    if (testUser?.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await stopTestApp();
  });

  describe('Step 1: Account Creation', () => {
    it.serial('should create and authenticate a new user', async () => {
      testUser = authHelper.createTestUser('lifecycle');
      const result = await authHelper.registerAndLogin(testUser, { skipOnboarding: true });

      testUser.token = result.token;
      testUser.userId = result.userId;

      expect(testUser.token).toBeDefined();
      expect(testUser.userId).toBeDefined();
    });

    it.serial('should reject duplicate email', async () => {
      const response = await app.request.post('/api/v1/accounts').send({
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
        acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
        acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
      });

      expect(response.status).toBe(409);
    });
  });

  describe('Step 2: Pre-Onboarding Status', () => {
    it.serial('should show incomplete onboarding status', async () => {
      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.hasCompletedOnboarding).toBe(false);
    });
  });

  describe('Step 3: Onboarding Completion', () => {
    it.serial('should complete onboarding with minimal data', async () => {
      const onboardingData = createMinimalOnboardingData(`lifecycle_${Date.now()}`);

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect(response.status).toBe(201);
      expect(response.body.resumeId).toBeDefined();

      resumeId = response.body.resumeId;
    });

    it.serial('should have updated onboarding status', async () => {
      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.hasCompletedOnboarding).toBe(true);
    });

    it.serial('should prevent duplicate onboarding', async () => {
      const onboardingData = createMinimalOnboardingData('duplicate');

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect([400, 409]).toContain(response.status);
    });
  });

  describe('Step 4: Resume Verification', () => {
    it.serial('should have created resume after onboarding', async () => {
      const response = await app.request
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      // Q1 PaginatedResponseSchema: `{ items, total, page, limit, ... }`.
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it.serial('should retrieve resume with sections', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/full`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(resumeId);
      // Resume has skills, experiences, education arrays
      expect(response.body).toHaveProperty('resumeSections');
      expect(Array.isArray(response.body.resumeSections)).toBe(true);
    });
  });

  describe('Step 5: Share Creation', () => {
    it.serial('should create a public share', async () => {
      const response = await app.request
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ resumeId });

      expect(response.status).toBe(201);
      // Shares return wrapped in data.share
      expect(response.body.share.slug).toBeDefined();
      expect(response.body.share.resumeId).toBe(resumeId);
      expect(response.body.share.isActive).toBe(true);

      shareSlug = response.body.share.slug;
      shareId = response.body.share.id;
    });

    it.serial('should list shares for resume', async () => {
      const response = await app.request
        .get(`/api/v1/shares/resume/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      // Returns wrapped in data.shares
      expect(Array.isArray(response.body.shares)).toBe(true);
      expect(response.body.shares.length).toBeGreaterThanOrEqual(1);
      expect(response.body.shares[0]).toHaveProperty('slug');
    });
  });

  describe('Step 6: Public Resume Access', () => {
    it.serial('should access public resume without authentication', async () => {
      const response = await app.request.get(`/api/v1/public/resumes/${shareSlug}`);

      expect(response.status).toBe(200);
      // Public resume returns { success, data: { resume: { ... } } }
      expect(response.body).toHaveProperty('resume');
      expect(response.body.resume.id).toBe(resumeId);
    });

    it.serial('should fail with invalid slug', async () => {
      const response = await app.request.get('/api/v1/public/resumes/nonexistent_slug_12345');

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Step 7: Share Deletion', () => {
    it.serial('should delete share by id', async () => {
      const deleteResponse = await app.request
        .delete(`/api/v1/shares/${shareId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect([200, 204]).toContain(deleteResponse.status);
    });

    it.serial('should no longer access deleted share', async () => {
      const response = await app.request.get(`/api/v1/public/resumes/${shareSlug}`);

      expect([404, 410]).toContain(response.status);
    });
  });
});
