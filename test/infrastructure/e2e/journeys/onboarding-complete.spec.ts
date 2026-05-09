/**
 * E2E Test: Onboarding Completion Journey
 *
 * Tests the happy path of completing onboarding with valid data.
 *
 * Flow:
 * 1. Create and authenticate user
 * 2. Complete onboarding with valid data
 * 3. Verify resume was created
 * 4. Verify onboarding status updated
 *
 * Response Formats:
 * - Onboarding POST: returns { success: true, resumeId }
 * - Resume GET /full: returns { data: { id, skills, experiences, education } }
 *
 * Target Time: < 15 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import { createFullOnboardingData, createMinimalOnboardingData } from '../fixtures/resumes.fixture';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E: Onboarding Completion', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: { email: string; password: string; name: string; token?: string; userId?: string };

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

  describe('Happy Path: Minimal Onboarding', () => {
    beforeAll(async () => {
      testUser = authHelper.createTestUser('onboarding_minimal');
      const result = await authHelper.registerAndLogin(testUser, { skipOnboarding: true });
      testUser.token = result.token;
      testUser.userId = result.userId;
    });

    it.serial('should show incomplete onboarding status before completion', async () => {
      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.hasCompletedOnboarding).toBe(false);
    });

    it.serial('should complete onboarding with minimal data', async () => {
      const onboardingData = createMinimalOnboardingData(`minimal_${Date.now()}`);

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect(response.status).toBe(201);
      expect(response.body.resumeId).toBeDefined();
    });

    it.serial('should show completed onboarding status after completion', async () => {
      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.hasCompletedOnboarding).toBe(true);
    });

    it.serial('should prevent duplicate onboarding completion', async () => {
      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(createMinimalOnboardingData(`dup_${Date.now()}`));

      expect([400, 409]).toContain(response.status);
    });
  });

  describe('Happy Path: Full Onboarding', () => {
    let fullUser: typeof testUser;
    let createdResumeId: string;

    beforeAll(async () => {
      fullUser = authHelper.createTestUser('onboarding_full');
      const result = await authHelper.registerAndLogin(fullUser, { skipOnboarding: true });
      fullUser.token = result.token;
      fullUser.userId = result.userId;
    });

    afterAll(async () => {
      if (fullUser?.email) {
        await cleanupHelper.deleteUserByEmail(fullUser.email);
      }
    });

    it.serial('should complete onboarding with full profile data', async () => {
      const onboardingData = createFullOnboardingData(`full_${Date.now()}`);

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${fullUser.token}`)
        .send(onboardingData);

      expect(response.status).toBe(201);
      expect(response.body.resumeId).toBeDefined();

      createdResumeId = response.body.resumeId;
    });

    it.serial('should have created resume with sections', async () => {
      const response = await app.request
        .get(`/api/v1/resumes/${createdResumeId}/full`)
        .set('Authorization', `Bearer ${fullUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(createdResumeId);
      // Verify resume has the expected sections
      expect(response.body).toHaveProperty('resumeSections');
      expect(Array.isArray(response.body.resumeSections)).toBe(true);
    });
  });

  describe('Authentication Boundary', () => {
    it.serial('should reject onboarding without authentication', async () => {
      const response = await app.request
        .post('/api/v1/onboarding')
        .send(createMinimalOnboardingData(`noauth_${Date.now()}`));

      expect(response.status).toBe(401);
    });

    it.serial('should reject status check without authentication', async () => {
      const response = await app.request.get('/api/v1/onboarding/status');

      expect(response.status).toBe(401);
    });

    it.serial('should reject with invalid token', async () => {
      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', 'Bearer invalid-token')
        .send(createMinimalOnboardingData(`badtoken_${Date.now()}`));

      expect(response.status).toBe(401);
    });
  });
});
