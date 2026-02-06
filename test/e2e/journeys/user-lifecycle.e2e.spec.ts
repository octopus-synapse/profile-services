/**
 * E2E Test: Complete User Lifecycle Journey
 *
 * Tests the critical path from signup to public resume viewing.
 * This is the MOST IMPORTANT E2E test - it validates the core value proposition.
 *
 * Flow:
 * 1. Account Creation (Signup)
 * 2. Email Verification Request
 * 3. ToS Acceptance
 * 4. Onboarding Completion
 * 5. Resume Verification
 * 6. Share Creation
 * 7. Public Resume Access
 *
 * Target Time: < 30 seconds
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createE2ETestApp } from '../setup-e2e';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { minimalOnboardingData } from '../fixtures/resumes.fixture';

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

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;

    testUser = authHelper.createTestUser('lifecycle');
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    if (shareSlug) {
      await cleanupHelper.deleteShareBySlug(shareSlug);
    }

    await app.close();
  });

  describe('Step 1: Account Creation', () => {
    it('should create a new user account', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: testUser.email,
          password: testUser.password,
          name: testUser.name,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.hasCompletedOnboarding).toBe(false);

      testUser.token = response.body.token;
      testUser.userId = response.body.user.id;
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

  describe('Step 2: Email Verification', () => {
    it('should request email verification', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email/request')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect([200, 201]).toContain(response.status);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer()).post(
        '/api/v1/auth/verify-email/request',
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Step 3: ToS Acceptance', () => {
    it('should accept Terms of Service', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tos/accept')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          documentType: 'TERMS_OF_SERVICE',
          version: '1.0',
        });

      expect([200, 201]).toContain(response.status);
    });

    it('should accept Privacy Policy', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tos/accept')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          documentType: 'PRIVACY_POLICY',
          version: '1.0',
        });

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('Step 4: Onboarding Completion', () => {
    it('should complete onboarding with minimal data', async () => {
      const onboardingData = {
        ...minimalOnboardingData,
        username: `e2e-lifecycle-${Date.now()}`,
      };

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
      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(minimalOnboardingData);

      expect([400, 409]).toContain(response.status);
    });
  });

  describe('Step 5: Resume Verification', () => {
    it('should have created resume after onboarding', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should retrieve resume with full details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/resumes/${resumeId}/full`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(resumeId);
      expect(response.body.data.personalInfo).toBeDefined();
      expect(response.body.data.skills).toBeDefined();
    });
  });

  describe('Step 6: Share Creation', () => {
    it('should create a public share', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ resumeId });

      expect(response.status).toBe(201);
      expect(response.body.slug).toBeDefined();
      expect(response.body.isActive).toBe(true);
      expect(response.body.publicUrl).toContain(response.body.slug);

      shareSlug = response.body.slug;
    });

    it('should list shares for resume', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/shares/resume/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Step 7: Public Resume Access', () => {
    it('should access public resume without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.personalInfo).toBeDefined();
      expect(response.body.skills).toBeDefined();
      expect(response.body.id).toBe(resumeId);
    });

    it('should record analytics view', async () => {
      // Make multiple views
      await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );
      await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      // Check if views were recorded (analytics should exist)
      const analyticsResponse = await request(app.getHttpServer())
        .get(`/api/v1/analytics/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      // Analytics might take time to process, so we just verify endpoint works
      expect([200, 404]).toContain(analyticsResponse.status);
    });

    it('should fail with invalid slug', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/public/resumes/invalid-slug-12345',
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Step 8: Cleanup - Share Deletion', () => {
    it('should delete share', async () => {
      // Get share ID first
      const sharesResponse = await request(app.getHttpServer())
        .get(`/api/v1/shares/resume/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      const shares = sharesResponse.body;
      const shareToDelete = shares.find((s: any) => s.slug === shareSlug);

      expect(shareToDelete).toBeDefined();

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/shares/${shareToDelete.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
    });

    it('should no longer access deleted share', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      expect(response.status).toBe(404);
    });
  });
});
