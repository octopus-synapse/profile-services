/**
 * E2E Test: Onboarding Validation
 *
 * Tests validation rules and error handling for onboarding data.
 * These tests verify the API correctly rejects invalid data with 400.
 *
 * Flow:
 * 1. Test required field validation
 * 2. Test format validation (username, email)
 * 3. Test boundary conditions
 *
 * IMPORTANT: Usernames can only contain lowercase letters, numbers, and underscores.
 * Hyphens are NOT allowed.
 *
 * Target Time: < 10 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

/**
 * Creates a valid base payload that can be modified for validation tests.
 * All required fields are present with valid values.
 * Username uses underscores only (no hyphens allowed).
 */
function createValidBasePayload(suffix: string = '') {
  const sanitizedSuffix = suffix.replace(/-/g, '_');
  return {
    username: `valid_user_${sanitizedSuffix}_${Date.now()}`,
    personalInfo: {
      fullName: 'Test User',
      email: `test_${sanitizedSuffix}@example.com`,
    },
    professionalProfile: { jobTitle: 'Developer', summary: 'A software developer' },
    skills: [],
    noSkills: true,
    experiences: [],
    noExperience: true,
    education: [],
    noEducation: true,
    languages: [{ name: 'English', level: 'FLUENT' }],
    resumeStyleId: null,
  };
}

describe('E2E: Onboarding Validation', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: { email: string; password: string; name: string; token?: string; userId?: string };

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;

    testUser = authHelper.createTestUser('onboarding_validation');
    const result = await authHelper.registerAndLogin(testUser, { skipOnboarding: true });
    testUser.token = result.token;
    testUser.userId = result.userId;
  });

  afterAll(async () => {
    // Use Promise.race to prevent hanging on slow cleanup
    const cleanup = async () => {
      if (testUser?.email) {
        await cleanupHelper.deleteUserByEmail(testUser.email).catch(() => {});
      }
      if (app) {
        await stopTestApp().catch(() => {});
      }
    };

    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
    await Promise.race([cleanup(), timeout]);
  });

  describe('Required Fields Validation', () => {
    it.serial('should reject empty request body', async () => {
      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it.serial('should reject missing username', async () => {
      const payload = createValidBasePayload('missing_username');
      const { username: _username, ...payloadWithoutUsername } = payload;

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payloadWithoutUsername);

      expect(response.status).toBe(400);
    });

    it.serial('should reject missing personalInfo', async () => {
      const payload = createValidBasePayload('missing_personal');
      const { personalInfo: _personalInfo, ...payloadWithoutPersonal } = payload;

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payloadWithoutPersonal);

      expect(response.status).toBe(400);
    });

    it.serial('accepts payload without resumeStyleId (optional → defaults applied)', async () => {
      // Resume-style is intentionally optional at completion time: the
      // adapter falls back to the seeded "default" ResumeStyle when the
      // user skipped the picker, so a missing field MUST NOT 400.
      // Suffix kept short — `valid_user_${suffix}_${Date.now()}` must
      // fit USERNAME_MAX_LENGTH (30 chars) or the whole payload 400s
      // for an unrelated reason.
      const payload = createValidBasePayload('rno');
      const { resumeStyleId: _omit, ...payloadWithoutStyle } = payload;

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payloadWithoutStyle);

      // 200/201 = accepted; 409 = already onboarded (test order); 422 = other
      // validation failure unrelated to this assertion (sections, etc.). The
      // only outcome this test rejects is 400 caused by the missing field.
      expect(response.status).not.toBe(400);
    });
  });

  describe('Username Validation', () => {
    it.serial('should reject username with special characters', async () => {
      const payload = createValidBasePayload('special_chars');
      payload.username = 'user@name!';

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it.serial('should reject username with hyphens', async () => {
      const payload = createValidBasePayload('hyphen_test');
      payload.username = 'user-name-test';

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it.serial('should reject username that is too short', async () => {
      const payload = createValidBasePayload('short_username');
      payload.username = 'ab';

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('Personal Info Validation', () => {
    // 'should reject invalid email format' — REMOVED. personalInfo.email
    // no longer exists in the onboarding domain; the canonical email is
    // `User.email` (signup) and is validated by the signup pipeline, not
    // the onboarding payload.

    it.serial('should reject empty fullName', async () => {
      const payload = createValidBasePayload('empty_name');
      payload.personalInfo.fullName = '';

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('Languages Validation', () => {
    it.serial('should reject invalid language level', async () => {
      const payload = createValidBasePayload('invalid_lang_level');
      payload.languages = [{ name: 'English', level: 'INVALID_LEVEL' as never }];

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it.serial('should reject empty language name', async () => {
      const payload = createValidBasePayload('empty_lang_name');
      payload.languages = [{ name: '', level: 'FLUENT' }];

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('Resume Style Validation', () => {
    it.serial('rejects non-UUID resumeStyleId', async () => {
      const payload = createValidBasePayload('rbd');
      // `resumeStyleId` is typed as `z.string().uuid().nullable()` — a free
      // string like "modern" used to be allowed via the legacy
      // `templateSelection.template` field; the new schema is strict.
      (payload as Record<string, unknown>).resumeStyleId = 'modern';

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it.serial('accepts resumeStyleId=null (skipped picker → default style)', async () => {
      const payload = createValidBasePayload('rnl');
      (payload as Record<string, unknown>).resumeStyleId = null;

      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      const body =
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
      expect(response.status, `400 body: ${body}`).not.toBe(400);
    });
  });

  describe('Content-Type Handling', () => {
    it.serial('should reject non-JSON content type', async () => {
      const response = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .set('Content-Type', 'text/plain')
        .send('not json');

      expect([400, 415]).toContain(response.status);
    });
  });
});
