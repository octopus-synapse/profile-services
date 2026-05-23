/**
 * Onboarding Flow Integration Tests
 *
 * Tests onboarding lifecycle with real database.
 * Validates business rules for onboarding endpoints.
 *
 * Kent Beck: "Integration tests are the safety net for refactoring"
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';

import type { PrismaClient } from '@prisma/client';
import { stopTestApp, type TestApp, tokenFromResponse } from '../shared';
import { clearAuthRateLimits, getApp, uniqueTestId, uniqueTestUsername } from './setup';

describe('Onboarding Flow Integration', () => {
  let app: TestApp;
  let prisma: PrismaClient;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: 'onboarding-integration-test@example.com',
    password: 'SecurePass123!',
    name: 'Onboarding Test User',
  };

  beforeAll(async () => {
    app = await getApp();
  });

  beforeEach(async () => {
    await clearAuthRateLimits();
    prisma = app.prisma;
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    // Create fresh test user for each test. /api/v1/accounts requires
    // the consent versions in the body (LGPD) and creates the
    // matching `UserConsent` rows itself, so we don't double-write.
    const email = `onboarding-${uniqueTestId()}@test.com`;
    const signupResponse = await app.request
      .post('/api/v1/accounts')
      .send({
        ...testUser,
        email,
        acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
        acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
      })
      .expect(201);

    userId = signupResponse.body.userId;

    // Verify email so the email-verified guard lets the test through.
    // Onboarding completion stays `false` since this suite exercises
    // that flow itself.
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    const loginResponse = await app.request
      .post('/api/v1/auth/login')
      .send({ email, password: testUser.password });
    accessToken = tokenFromResponse(loginResponse, 'access_token')!;
  });

  afterEach(async () => {
    // Clean up test data - use try/catch to handle connection issues
    try {
      await prisma.onboardingProgress.deleteMany({ where: { userId } });
      await prisma.resume.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // Ignore cleanup errors - may already be deleted or connection closed
    }
  });

  describe('Onboarding Status', () => {
    it('should return onboarding status for new user', async () => {
      const response = await app.request
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.hasCompletedOnboarding).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      await app.request.get('/api/v1/onboarding/status').expect(401);
    });
  });

  describe('Onboarding Progress', () => {
    it('should get initial progress for new user', async () => {
      const response = await app.request
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      // Initial progress should have default values
      expect(response.body.currentStep).toBeDefined();
    });

    it('should save onboarding progress', async () => {
      const progressData = {
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
        personalInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
      };

      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body).toBeDefined();
      // success is at envelope level
    });

    it('should reject unauthenticated progress save', async () => {
      await app.request
        .put('/api/v1/onboarding/progress')
        .send({ currentStep: 'personalInfo' })
        .expect(401);
    });
  });

  describe('Complete Onboarding', () => {
    it('should complete onboarding with valid data', async () => {
      const onboardingData = {
        username: uniqueTestUsername('testuser'),
        personalInfo: {
          fullName: 'Complete User',
          email: 'complete@test.com',
        },
        professionalProfile: {
          jobTitle: 'Software Engineer',
          summary: 'Experienced developer',
        },
        noExperience: true,
        experiences: [],
        noEducation: true,
        education: [],
        noSkills: true,
        skills: [],
        languages: [{ name: 'English', level: 'NATIVE' }],
        resumeStyleId: null,
      };

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(onboardingData);

      expect([200, 201].includes(response.status)).toBe(true);
    });

    it('should reject onboarding without authentication', async () => {
      await app.request.post('/api/v1/onboarding').send({ personalInfo: {} }).expect(401);
    });

    it('should reject invalid onboarding data', async () => {
      // Send invalid data (missing required fields)
      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          personalInfo: { fullName: '' }, // Invalid: empty name
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });
});
