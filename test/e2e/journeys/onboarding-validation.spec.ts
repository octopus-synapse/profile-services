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

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2ETestApp } from '../setup-e2e';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';

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
    professionalProfile: {
      jobTitle: 'Developer',
      summary: 'A software developer',
    },
    skills: [],
    noSkills: true,
    experiences: [],
    noExperience: true,
    education: [],
    noEducation: true,
    languages: [{ name: 'English', level: 'FLUENT' }],
    templateSelection: { template: 'modern', palette: 'default' },
  };
}

describe('E2E: Onboarding Validation', () => {
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

    testUser = authHelper.createTestUser('onboarding_validation');
    const result = await authHelper.registerAndLogin(testUser);
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
        await app.close().catch(() => {});
      }
    };

    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
    await Promise.race([cleanup(), timeout]);
  });

  describe('Required Fields Validation', () => {
    it('should reject empty request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject missing username', async () => {
      const payload = createValidBasePayload('missing_username');
      const { username: _username, ...payloadWithoutUsername } = payload;

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payloadWithoutUsername);

      expect(response.status).toBe(400);
    });

    it('should reject missing personalInfo', async () => {
      const payload = createValidBasePayload('missing_personal');
      const { personalInfo: _personalInfo, ...payloadWithoutPersonal } =
        payload;

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payloadWithoutPersonal);

      expect(response.status).toBe(400);
    });

    it('should reject missing templateSelection', async () => {
      const payload = createValidBasePayload('missing_template');
      const { templateSelection: _template, ...payloadWithoutTemplate } =
        payload;

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payloadWithoutTemplate);

      expect(response.status).toBe(400);
    });
  });

  describe('Username Validation', () => {
    it('should reject username with special characters', async () => {
      const payload = createValidBasePayload('special_chars');
      payload.username = 'user@name!';

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should reject username with hyphens', async () => {
      const payload = createValidBasePayload('hyphen_test');
      payload.username = 'user-name-test';

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should reject username that is too short', async () => {
      const payload = createValidBasePayload('short_username');
      payload.username = 'ab';

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('Personal Info Validation', () => {
    it('should reject invalid email format', async () => {
      const payload = createValidBasePayload('invalid_email');
      payload.personalInfo.email = 'not-an-email';

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should reject empty fullName', async () => {
      const payload = createValidBasePayload('empty_name');
      payload.personalInfo.fullName = '';

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('Languages Validation', () => {
    it('should reject invalid language level', async () => {
      const payload = createValidBasePayload('invalid_lang_level');
      payload.languages = [{ name: 'English', level: 'INVALID_LEVEL' as any }];

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should reject empty language name', async () => {
      const payload = createValidBasePayload('empty_lang_name');
      payload.languages = [{ name: '', level: 'FLUENT' }];

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('Template Selection Validation', () => {
    it('should reject empty template', async () => {
      const payload = createValidBasePayload('empty_template');
      payload.templateSelection = { template: '', palette: 'default' };

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it('should reject empty palette', async () => {
      const payload = createValidBasePayload('empty_palette');
      payload.templateSelection = { template: 'modern', palette: '' };

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(payload);

      expect(response.status).toBe(400);
    });
  });

  describe('Content-Type Handling', () => {
    it('should reject non-JSON content type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .set('Content-Type', 'text/plain')
        .send('not json');

      expect([400, 415]).toContain(response.status);
    });
  });
});
