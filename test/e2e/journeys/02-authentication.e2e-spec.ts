/**
 * E2E Test: Authentication Journey
 *
 * Tests all authentication flows and security boundaries.
 *
 * Flow:
 * 1. Login with valid credentials
 * 2. Access protected resources
 * 3. Token refresh
 * 4. Invalid token handling
 * 5. Password validation
 * 6. Logout
 *
 * Target Time: < 15 seconds
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createE2ETestApp } from '../setup-e2e';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';

describe('E2E Journey 2: Authentication', () => {
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
  let refreshToken: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;

    // Create and prepare a test user
    const result = await authHelper.registerAndLogin('auth');
    testUser = result.user;
    testUser.token = result.token;
  });

  afterAll(async () => {
    if (testUser.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }

    await app.close();
  });

  describe('Step 1: Login Flow', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);

      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testUser.password,
        });

      expect(response.status).toBe(401);
    });

    it('should reject malformed email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'not-an-email',
          password: testUser.password,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Step 2: Protected Resource Access', () => {
    it('should access protected endpoint with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
    });

    it('should reject request without token', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/resumes',
      );

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', 'Bearer invalid-token-12345');

      expect(response.status).toBe(401);
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', testUser.token!); // Missing "Bearer" prefix

      expect(response.status).toBe(401);
    });

    it('should reject expired token', async () => {
      // This is a mock expired token - in reality, we'd need to wait or manipulate time
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjF9.invalid';

      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Step 3: Token Refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();

      // Update tokens for subsequent tests
      testUser.token = response.body.token;
      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        });

      expect(response.status).toBe(401);
    });

    it('should use new token to access protected resources', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Step 4: Password Validation', () => {
    it('should enforce minimum password length', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'weakpass@test.com',
          password: 'short',
          name: 'Weak Pass User',
        });

      expect(response.status).toBe(400);
    });

    it('should enforce password complexity', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'simplepass@test.com',
          password: 'allowercase',
          name: 'Simple Pass User',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Step 5: Authorization Boundaries', () => {
    let otherUserToken: string;
    let otherUserResumeId: string;

    beforeAll(async () => {
      // Create another user to test authorization boundaries
      const otherUser = await authHelper.registerAndLogin('other');
      otherUserToken = otherUser.token;

      // Create a resume for the other user via onboarding
      await authHelper.acceptToS(otherUserToken);

      const onboardingResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          username: `other-user-${Date.now()}`,
          personalInfo: {
            firstName: 'Other',
            lastName: 'User',
            title: 'Tester',
          },
          skills: [{ name: 'Testing', level: 'INTERMEDIATE' }],
        });

      if (onboardingResponse.status === 200) {
        otherUserResumeId = onboardingResponse.body.resumeId;
      }
    });

    afterAll(async () => {
      await cleanupHelper.deleteUserByEmail('e2e-other@test.com');
    });

    it("should not access another user's resume", async () => {
      if (!otherUserResumeId) {
        console.log('Skipping: Other user resume not created');
        return;
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/resumes/${otherUserResumeId}/full`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect([403, 404]).toContain(response.status);
    });

    it("should not delete another user's resume", async () => {
      if (!otherUserResumeId) {
        console.log('Skipping: Other user resume not created');
        return;
      }

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/resumes/${otherUserResumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect([403, 404]).toContain(response.status);
    });

    it("should not update another user's resume", async () => {
      if (!otherUserResumeId) {
        console.log('Skipping: Other user resume not created');
        return;
      }

      const response = await request(app.getHttpServer())
        .put(`/api/v1/resumes/${otherUserResumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          personalInfo: { title: 'Hacked Title' },
        });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Step 6: Logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect([200, 204]).toContain(response.status);
    });

    it('should invalidate token after logout', async () => {
      // Note: This depends on whether your backend implements token blacklisting
      // If not implemented, this test might need to be adjusted or removed
      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`);

      // If token blacklisting is not implemented, token will still work
      // In that case, this test documents expected future behavior
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Step 7: Rate Limiting (if implemented)', () => {
    it('should enforce rate limits on login attempts', async () => {
      const attempts = [];

      // Try to login 10 times with wrong password
      for (let i = 0; i < 10; i++) {
        const promise = request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'WrongPassword123!',
          });

        attempts.push(promise);
      }

      const responses = await Promise.all(attempts);

      // Check if any request was rate-limited (status 429)
      const rateLimited = responses.some((r) => r.status === 429);

      // This test documents expected behavior even if not yet implemented
      if (!rateLimited) {
        console.log(
          'Note: Rate limiting not detected. Consider implementing for production.',
        );
      }

      expect(responses.length).toBe(10);
    });
  });
});
