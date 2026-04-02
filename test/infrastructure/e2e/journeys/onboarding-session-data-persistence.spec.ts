/**
 * E2E Test: Onboarding Session Data Persistence
 *
 * TDD: Tests that step data is correctly persisted when advancing through onboarding.
 *
 * Bug discovered: The /session/next endpoint advances steps but does NOT persist
 * step data (professionalProfile, template, theme, palette are all null after advancing).
 *
 * This test MUST FAIL until the bug is fixed.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E: Onboarding Session Data Persistence', () => {
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

  describe('Session Next Command - Data Persistence', () => {
    const testUsername = `persist_test_${Date.now()}`;

    beforeAll(async () => {
      testUser = authHelper.createTestUser('session_persist');
      const result = await authHelper.registerAndLogin(testUser);
      testUser.token = result.token;
      testUser.userId = result.userId;
    });

    it('should persist personalInfo when advancing from personal-info step', async () => {
      // Advance from welcome to personal-info
      await request(app.getHttpServer())
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

      const advanceResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(personalInfoData);

      expect(advanceResponse.status).toBe(200);
      expect(advanceResponse.body.data.currentStep).toBe('username');

      // Verify personalInfo was persisted
      const sessionResponse = await request(app.getHttpServer())
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.data.personalInfo).toBeDefined();
      expect(sessionResponse.body.data.personalInfo.fullName).toBe('Test Persistence User');
      expect(sessionResponse.body.data.personalInfo.email).toBe(testUser.email);
    });

    it('should persist username when advancing from username step', async () => {
      // Advance from username to professional-profile WITH username
      const usernameData = { username: testUsername };

      const advanceResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(usernameData);

      expect(advanceResponse.status).toBe(200);
      expect(advanceResponse.body.data.currentStep).toBe('professional-profile');

      // Verify username was persisted
      const sessionResponse = await request(app.getHttpServer())
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.data.username).toBe(testUsername);
    });

    it('should persist professionalProfile when advancing from professional-profile step', async () => {
      // Advance from professional-profile to template WITH profile data
      const profileData = {
        jobTitle: 'Senior Software Engineer',
        summary:
          'Experienced developer with expertise in building scalable web applications using modern technologies.',
      };

      const advanceResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(profileData);

      expect(advanceResponse.status).toBe(200);

      // Verify professionalProfile was persisted
      const sessionResponse = await request(app.getHttpServer())
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(sessionResponse.status).toBe(200);

      // BUG: This assertion FAILS because professionalProfile is null
      expect(sessionResponse.body.data.professionalProfile).toBeDefined();
      expect(sessionResponse.body.data.professionalProfile.jobTitle).toBe(
        'Senior Software Engineer',
      );
      expect(sessionResponse.body.data.professionalProfile.summary).toContain(
        'Experienced developer',
      );
    });

    it('should persist templateSelection when advancing from template step', async () => {
      // First, advance through all section steps to reach template
      // Current step after professionalProfile test is section:work_experience_v1
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({ noData: true });
      }

      // Verify we're now at template step
      const beforeTemplate = await request(app.getHttpServer())
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(beforeTemplate.body.data.currentStep).toBe('template');

      // Now advance from template to review WITH template data
      const templateData = {
        templateId: 'modern',
        colorScheme: 'blue',
      };

      const advanceResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(templateData);

      expect(advanceResponse.status).toBe(200);

      // Verify template was persisted
      const sessionResponse = await request(app.getHttpServer())
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(sessionResponse.status).toBe(200);

      // templateSelection is returned in the session response
      expect(sessionResponse.body.data.templateSelection).toBeDefined();
      expect(sessionResponse.body.data.templateSelection.templateId).toBe('modern');
      expect(sessionResponse.body.data.templateSelection.colorScheme).toBe('blue');
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
      const result = await authHelper.registerAndLogin(completeTestUser);
      completeTestUser.token = result.token;
      completeTestUser.userId = result.userId;
    });

    afterAll(async () => {
      if (completeTestUser?.email) {
        await cleanupHelper.deleteUserByEmail(completeTestUser.email);
      }
    });

    it('should complete onboarding after all data is persisted via /session/next', async () => {
      // Step 1: welcome -> personal-info
      await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${completeTestUser.token}`)
        .send({});

      // Step 2: personal-info -> username
      await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${completeTestUser.token}`)
        .send({
          fullName: 'Complete Test User',
          email: completeTestUser.email,
        });

      // Step 3: username -> professional-profile
      await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${completeTestUser.token}`)
        .send({ username: completeUsername });

      // Step 4: professional-profile -> section:work_experience_v1
      await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${completeTestUser.token}`)
        .send({
          jobTitle: 'Software Engineer',
          summary: 'Experienced developer building web applications with React and Node.js.',
        });

      // Steps 5-8: Skip all section steps (work_experience, education, skills, language)
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${completeTestUser.token}`)
          .send({ noData: true });
      }

      // Step 9: template -> review WITH template data
      await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${completeTestUser.token}`)
        .send({ templateId: 'default', colorScheme: 'blue' });

      // Check we're at review
      const sessionBeforeComplete = await request(app.getHttpServer())
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${completeTestUser.token}`);

      expect(sessionBeforeComplete.body.data.currentStep).toBe('review');

      // Verify all required data was persisted before attempting complete
      expect(sessionBeforeComplete.body.data.personalInfo).toBeDefined();
      expect(sessionBeforeComplete.body.data.username).toBe(completeUsername);
      expect(sessionBeforeComplete.body.data.professionalProfile).toBeDefined();
      expect(sessionBeforeComplete.body.data.templateSelection).toBeDefined();

      // Now complete - this SHOULD succeed if data was persisted
      const completeResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding/session/complete')
        .set('Authorization', `Bearer ${completeTestUser.token}`);

      // Complete should succeed (200 or 201 depending on whether creating or updating)
      expect([200, 201]).toContain(completeResponse.status);
      expect(completeResponse.body.success).toBe(true);
      expect(completeResponse.body.data.resumeId).toBeDefined();
    });
  });
});
