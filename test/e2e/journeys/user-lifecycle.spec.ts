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

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2ETestApp } from '../setup-e2e';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createMinimalOnboardingData } from '../fixtures/resumes.fixture';

describe('E2E Journey 1: Complete User Lifecycle', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };
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
    await app.close();
  });

  describe('Step 1: Account Creation', () => {
    it('should create and authenticate a new user', async () => {
      testUser = authHelper.createTestUser('lifecycle');
      const result = await authHelper.registerAndLogin(testUser);

      testUser.token = result.token;
      testUser.userId = result.userId;

      expect(testUser.token).toBeDefined();
      expect(testUser.userId).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        });

      expect(response.status).toBe(409);
    });
  });

  describe('Step 2: Pre-Onboarding Status', () => {
    it('should show incomplete onboarding status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.hasCompletedOnboarding).toBe(false);
    });
  });

  describe('Step 3: Onboarding Completion', () => {
    it('should complete onboarding with minimal data', async () => {
      const onboardingData = createMinimalOnboardingData(
        `lifecycle_${Date.now()}`,
      );

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.resumeId).toBeDefined();

      resumeId = response.body.resumeId;
    });

    it('should have updated onboarding status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.hasCompletedOnboarding).toBe(true);
    });

    it('should prevent duplicate onboarding', async () => {
      const onboardingData = createMinimalOnboardingData('duplicate');

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect([400, 409]).toContain(response.status);
    });
  });

  describe('Step 4: Resume Verification', () => {
    it('should have created resume after onboarding', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should retrieve resume with sections', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/resumes/${resumeId}/full`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(resumeId);
      // Resume has skills, experiences, education arrays
      expect(response.body.data).toHaveProperty('skills');
      expect(response.body.data).toHaveProperty('experiences');
      expect(response.body.data).toHaveProperty('education');
    });
  });

  describe('Step 5: Share Creation', () => {
    it('should create a public share', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ resumeId });

      expect(response.status).toBe(201);
      // Shares return object directly, not wrapped in data
      expect(response.body.slug).toBeDefined();
      expect(response.body.resumeId).toBe(resumeId);
      expect(response.body.isActive).toBe(true);

      shareSlug = response.body.slug;
      shareId = response.body.id;
    });

    it('should list shares for resume', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/shares/resume/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      // Returns array directly
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0]).toHaveProperty('slug');
    });
  });

  describe('Step 6: Public Resume Access', () => {
    it('should access public resume without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      expect(response.status).toBe(200);
      // Public resume returns { resume: { id, title, ... } }
      expect(response.body).toHaveProperty('resume');
      expect(response.body.resume.id).toBe(resumeId);
    });

    it('should fail with invalid slug', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/public/resumes/nonexistent_slug_12345',
      );

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Step 7: Share Deletion', () => {
    it('should delete share by id', async () => {
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/shares/${shareId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect([200, 204]).toContain(deleteResponse.status);
    });

    it('should no longer access deleted share', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      expect([404, 410]).toContain(response.status);
    });
  });
});
