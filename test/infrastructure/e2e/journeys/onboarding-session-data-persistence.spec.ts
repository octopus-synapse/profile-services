/**
 * E2E Test: Onboarding Session Data Persistence
 *
 * TDD: Tests that step data is correctly persisted when advancing through onboarding.
 *
 * Bug discovered: The /session/next endpoint advances steps but does NOT persist
 * step data (professionalProfile, template, palette are all null after advancing).
 *
 * This test MUST FAIL until the bug is fixed.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E: Onboarding Session Data Persistence', () => {
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

  describe('Session Next Command - Data Persistence', () => {
    const testUsername = `persist_test_${Date.now()}`;

    beforeAll(async () => {
      testUser = authHelper.createTestUser('session_persist');
      const result = await authHelper.registerAndLogin(testUser, { skipOnboarding: true });
      testUser.token = result.token;
      testUser.userId = result.userId;
    });

    it.serial('should persist personalInfo when advancing from personal-info step', async () => {
      // Advance from welcome to personal-info
      await app.request
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({});

      // Advance from personal-info to username WITH data
      const personalInfoData = {
        fullName: 'Test Persistence User',
        email: testUser.email,
        phone: '+1234567890',
        location: 'Test City',
      };

      const advanceResponse = await app.request
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(personalInfoData);

      expect(advanceResponse.status).toBe(201);
      expect(advanceResponse.body.currentStep).toBe('username');

      // Verify personalInfo was persisted
      const sessionResponse = await app.request
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.personalInfo).toBeDefined();
      expect(sessionResponse.body.personalInfo.fullName).toBe('Test Persistence User');
      expect(sessionResponse.body.personalInfo.email).toBe(testUser.email);
    });

    it.serial('should persist username when advancing from username step', async () => {
      // Advance from username to professional-profile WITH username
      const usernameData = { username: testUsername };

      const advanceResponse = await app.request
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(usernameData);

      expect(advanceResponse.status).toBe(201);
      expect(advanceResponse.body.currentStep).toBe('professional-profile');

      // Verify username was persisted
      const sessionResponse = await app.request
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.username).toBe(testUsername);
    });

    it.serial(
      'should persist professionalProfile when advancing from professional-profile step',
      async () => {
        // Advance from professional-profile to template WITH profile data
        const profileData = {
          jobTitle: 'Senior Software Engineer',
          summary:
            'Experienced developer with expertise in building scalable web applications using modern technologies.',
        };

        const advanceResponse = await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send(profileData);

        expect(advanceResponse.status).toBe(201);

        // Verify professionalProfile was persisted
        const sessionResponse = await app.request
          .get('/api/v1/onboarding/session')
          .set('Authorization', `Bearer ${testUser.token}`);

        expect(sessionResponse.status).toBe(200);

        // BUG: This assertion FAILS because professionalProfile is null
        expect(sessionResponse.body.professionalProfile).toBeDefined();
        expect(sessionResponse.body.professionalProfile.jobTitle).toBe('Senior Software Engineer');
        expect(sessionResponse.body.professionalProfile.summary).toContain('Experienced developer');
      },
    );

    it.serial('should persist templateSelection when advancing from template step', async () => {
      // First, advance through all section steps to reach template
      // Current step after professionalProfile test is section:work_experience_v1
      for (let i = 0; i < 4; i++) {
        await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({ noData: true });
      }

      // Verify we're now at template step
      const beforeTemplate = await app.request
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(beforeTemplate.body.currentStep).toBe('template');

      // Now advance from template to review WITH template data
      const templateData = { templateId: 'modern', colorScheme: 'blue' };

      const advanceResponse = await app.request
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(templateData);

      expect(advanceResponse.status).toBe(201);

      // Verify template was persisted
      const sessionResponse = await app.request
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(sessionResponse.status).toBe(200);

      // templateSelection is returned in the session response
      expect(sessionResponse.body.templateSelection).toBeDefined();
      expect(sessionResponse.body.templateSelection.templateId).toBe('modern');
      expect(sessionResponse.body.templateSelection.colorScheme).toBe('blue');
    });
  });

  describe('Session Complete - Requires Persisted Data', () => {
    let completeTestUser: {
      email: string;
      password: string;
      name: string;
      token?: string;
      userId?: string;
    };
    const completeUsername = `complete_test_${Date.now()}`;

    beforeAll(async () => {
      completeTestUser = authHelper.createTestUser('session_complete');
      const result = await authHelper.registerAndLogin(completeTestUser, { skipOnboarding: true });
      completeTestUser.token = result.token;
      completeTestUser.userId = result.userId;
    });

    afterAll(async () => {
      if (completeTestUser?.email) {
        await cleanupHelper.deleteUserByEmail(completeTestUser.email);
      }
    });

    it.serial(
      'should complete onboarding after all data is persisted via /session/next',
      async () => {
        // Step 1: welcome -> personal-info
        await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${completeTestUser.token}`)
          .send({});

        // Step 2: personal-info -> username
        await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${completeTestUser.token}`)
          .send({ fullName: 'Complete Test User', email: completeTestUser.email });

        // Step 3: username -> professional-profile
        await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${completeTestUser.token}`)
          .send({ username: completeUsername });

        // Step 4: professional-profile -> section:work_experience_v1
        await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${completeTestUser.token}`)
          .send({
            jobTitle: 'Software Engineer',
            summary: 'Experienced developer building web applications with React and Node.js.',
          });

        // Steps 5-8: Skip all section steps (work_experience, education, skills, language)
        for (let i = 0; i < 4; i++) {
          await app.request
            .post('/api/v1/onboarding/session/next')
            .set('Authorization', `Bearer ${completeTestUser.token}`)
            .send({ noData: true });
        }

        // Step 9: template -> review WITH template data
        await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${completeTestUser.token}`)
          .send({ templateId: 'default', colorScheme: 'blue' });

        // Check we're at review
        const sessionBeforeComplete = await app.request
          .get('/api/v1/onboarding/session')
          .set('Authorization', `Bearer ${completeTestUser.token}`);

        expect(sessionBeforeComplete.body.currentStep).toBe('review');

        // Verify all required data was persisted before attempting complete
        expect(sessionBeforeComplete.body.personalInfo).toBeDefined();
        expect(sessionBeforeComplete.body.username).toBe(completeUsername);
        expect(sessionBeforeComplete.body.professionalProfile).toBeDefined();
        expect(sessionBeforeComplete.body.templateSelection).toBeDefined();

        // Now complete - this SHOULD succeed if data was persisted
        const completeResponse = await app.request
          .post('/api/v1/onboarding/session/complete')
          .set('Authorization', `Bearer ${completeTestUser.token}`);

        // Complete should succeed (200 or 201 depending on whether creating or updating)
        expect([200, 201]).toContain(completeResponse.status);
        expect(completeResponse.body.resumeId).toBeDefined();
      },
    );
  });
});
