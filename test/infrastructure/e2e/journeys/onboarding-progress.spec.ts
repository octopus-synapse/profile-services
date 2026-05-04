/**
 * E2E Test: Onboarding Progress Checkpoint
 *
 * Tests the save/restore progress functionality for multi-step onboarding.
 *
 * Flow:
 * 1. Start onboarding process
 * 2. Save progress at each step
 * 3. Retrieve saved progress
 * 4. Resume from checkpoint
 * 5. Complete onboarding
 *
 * Target Time: < 15 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E: Onboarding Progress Checkpoint', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;

    testUser = authHelper.createTestUser('progress-test');
    const result = await authHelper.registerAndLogin(testUser, { skipOnboarding: true });
    testUser.token = result.token;
    testUser.userId = result.userId;
    // Email verification and ToS acceptance handled by registerAndLogin
  });

  afterAll(async () => {
    if (testUser?.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await stopTestApp();
  });

  describe('Progress Persistence', () => {
    const progressData = {
      currentStep: 'personal-info',
      completedSteps: ['welcome'],
      personalInfo: {
        fullName: 'Progress Test User',
        email: 'progress@example.com',
      },
    };

    it.serial('should save onboarding progress', async () => {
      const response = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(progressData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it.serial('should retrieve saved progress', async () => {
      const response = await app.request
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.currentStep).toBe(progressData.currentStep);
      expect(response.body.data.completedSteps).toContain('welcome');
      expect(response.body.data.personalInfo).toBeDefined();
    });

    it.serial('should update existing progress', async () => {
      const updatedProgress = {
        currentStep: 'professional-profile',
        completedSteps: ['welcome', 'personal-info'],
        personalInfo: progressData.personalInfo,
        professionalProfile: {
          jobTitle: 'Senior Developer',
          summary: 'Experienced full-stack developer',
        },
      };

      const saveResponse = await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(updatedProgress);

      expect(saveResponse.status).toBe(200);

      const getResponse = await app.request
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.currentStep).toBe('professional-profile');
      expect(getResponse.body.data.completedSteps).toContain('personal-info');
      expect(getResponse.body.data.professionalProfile).toBeDefined();
    });
  });

  describe('Progress Without Authentication', () => {
    it.serial('should reject progress save without token', async () => {
      // Body must satisfy OnboardingProgressSchema so Zod validation
      // doesn't 400 the request before the auth stage runs.
      const response = await app.request.put('/api/v1/onboarding/progress').send({
        currentStep: 'personal-info',
        completedSteps: [],
      });

      expect(response.status).toBe(401);
    });

    it.serial('should reject progress retrieval without token', async () => {
      const response = await app.request.get('/api/v1/onboarding/progress');

      expect(response.status).toBe(401);
    });
  });

  describe('Progress Isolation', () => {
    it.serial('should isolate progress between users', async () => {
      // Create second user
      const secondUser = authHelper.createTestUser('progress-isolation');
      const result = await authHelper.registerAndLogin(secondUser, { skipOnboarding: true });
      // Email verification and ToS acceptance handled by registerAndLogin

      // Save progress for second user
      await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${result.token}`)
        .send({
          currentStep: 'skills',
          completedSteps: ['welcome', 'personal-info', 'professional-profile'],
        });

      // Verify first user still has their own progress
      const firstUserProgress = await app.request
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(firstUserProgress.status).toBe(200);
      expect(firstUserProgress.body.data.currentStep).not.toBe('skills');

      // Cleanup second user
      await cleanupHelper.deleteUserByEmail(secondUser.email);
    });
  });

  describe('Complete After Progress', () => {
    let completionUser: typeof testUser;

    beforeAll(async () => {
      completionUser = authHelper.createTestUser('complete-after-progress');
      const result = await authHelper.registerAndLogin(completionUser, { skipOnboarding: true });
      completionUser.token = result.token;
      completionUser.userId = result.userId;
      // Email verification and ToS acceptance handled by registerAndLogin
    });

    afterAll(async () => {
      if (completionUser?.email) {
        await cleanupHelper.deleteUserByEmail(completionUser.email);
      }
    });

    it.serial('should save progress then complete onboarding', async () => {
      // First, save partial progress
      await app.request
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${completionUser.token}`)
        .send({
          currentStep: 'skills',
          completedSteps: ['welcome', 'personal-info'],
          personalInfo: {
            fullName: 'Complete After Progress User',
            email: 'complete@example.com',
          },
        });

      // Then complete onboarding
      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${completionUser.token}`)
        .send({
          username: `complete_${Date.now()}`,
          personalInfo: {
            fullName: 'Complete After Progress User',
            email: 'complete@example.com',
          },
          professionalProfile: {
            jobTitle: 'Software Engineer',
            summary: 'Building software',
          },
          skills: [{ name: 'JavaScript', category: 'Programming' }],
          noSkills: false,
          experiences: [],
          noExperience: true,
          education: [],
          noEducation: true,
          languages: [{ name: 'English', level: 'NATIVE' }],
          templateSelection: { template: 'PROFESSIONAL', palette: 'DEFAULT' },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
