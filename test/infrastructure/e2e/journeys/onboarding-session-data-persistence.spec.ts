/**
 * E2E Test: Onboarding Session Data Persistence
 *
 * Locks the contract that `/session/next` actually persists each step's
 * payload before advancing. The original bug we caught here was that the
 * server returned the new currentStep but left `professionalProfile` /
 * resume-style selection null in the next `/session` read.
 *
 * After the ResumeStyle canonicalization refactor, the picker step is
 * `resume-style` and stores `resumeStyleId` (FK to ResumeStyle) instead
 * of the legacy `templateSelection.{templateId, colorScheme}` blob.
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

    it.serial('persists resumeStyleId when advancing from the resume-style step', async () => {
      // Advance through the section block — the canonical order ships
      // 5 core sections (work_experience, education, skill_set,
      // soft_skill_set, language) before the resume-style step. We
      // drive the cursor forward by reading the session in a loop until
      // we hit `resume-style`, so the test is robust to section count
      // tweaks in the seed.
      for (let i = 0; i < 10; i++) {
        const session = await app.request
          .get('/api/v1/onboarding/session')
          .set('Authorization', `Bearer ${testUser.token}`);
        if (session.body.currentStep === 'resume-style') break;
        await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${testUser.token}`)
          .send({ noData: true });
      }

      // Verify we're now at the resume-style step.
      const beforeStyle = await app.request
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(beforeStyle.body.currentStep).toBe('resume-style');

      // The available styles are injected as `data` on the step config.
      const styleStep = beforeStyle.body.steps.find((s: { id: string }) => s.id === 'resume-style');
      const firstStyleId = (styleStep?.data as Array<{ id: string }> | undefined)?.[0]?.id;
      expect(firstStyleId).toBeTypeOf('string');

      // Now advance from resume-style to review WITH a real style id.
      const advanceResponse = await app.request
        .post('/api/v1/onboarding/session/next')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ resumeStyleId: firstStyleId });

      expect(advanceResponse.status).toBe(201);

      // Verify the style id was persisted on the session payload.
      const sessionResponse = await app.request
        .get('/api/v1/onboarding/session')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.resumeStyleId).toBe(firstStyleId);
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

        // Skip all section steps (work_experience, education, skill_set,
        // soft_skill_set, language) — drive the cursor forward until we
        // hit `resume-style` instead of hardcoding the count.
        for (let i = 0; i < 10; i++) {
          const session = await app.request
            .get('/api/v1/onboarding/session')
            .set('Authorization', `Bearer ${completeTestUser.token}`);
          if (session.body.currentStep === 'resume-style') break;
          await app.request
            .post('/api/v1/onboarding/session/next')
            .set('Authorization', `Bearer ${completeTestUser.token}`)
            .send({ noData: true });
        }

        // resume-style -> review WITH a chosen style id.
        // Read the style id from the session — the picker step ships the
        // available styles as `data`, mirroring the production flow.
        const sessionAtStyleStep = await app.request
          .get('/api/v1/onboarding/session')
          .set('Authorization', `Bearer ${completeTestUser.token}`);
        const styleStep = sessionAtStyleStep.body.steps.find(
          (s: { id: string }) => s.id === 'resume-style',
        );
        const chosenStyleId = (styleStep?.data as Array<{ id: string }> | undefined)?.[0]?.id;

        await app.request
          .post('/api/v1/onboarding/session/next')
          .set('Authorization', `Bearer ${completeTestUser.token}`)
          .send({ resumeStyleId: chosenStyleId });

        // Check we're at review
        const sessionBeforeComplete = await app.request
          .get('/api/v1/onboarding/session')
          .set('Authorization', `Bearer ${completeTestUser.token}`);

        expect(sessionBeforeComplete.body.currentStep).toBe('review');

        // Verify all required data was persisted before attempting complete
        expect(sessionBeforeComplete.body.personalInfo).toBeDefined();
        expect(sessionBeforeComplete.body.username).toBe(completeUsername);
        expect(sessionBeforeComplete.body.professionalProfile).toBeDefined();
        expect(sessionBeforeComplete.body.resumeStyleId).toBe(chosenStyleId);

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
