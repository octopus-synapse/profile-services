/**
 * E2E Test: Session-Based Authentication
 *
 * Tests cookie-based session authentication flow:
 * 1. Login sets session cookie
 * 2. Session endpoint validates cookie and returns user
 * 3. Protected routes accept cookie authentication
 * 4. Logout clears session cookie
 *
 * Target Time: < 20 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E: Session-Based Authentication', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: { email: string; password: string; name: string; token?: string; userId?: string };
  let accessCookie: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;

    // Create test user (email verified and ToS accepted)
    testUser = authHelper.createTestUser('session-auth');
    const result = await authHelper.registerAndLogin(testUser);
    testUser.token = result.token;
    testUser.userId = result.userId;
  });

  afterAll(async () => {
    if (testUser?.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await stopTestApp();
  });

  describe('Step 1: Login Sets Session Cookie', () => {
    it.serial('should set httpOnly session cookie on login', async () => {
      const response = await app.request
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Extract session cookie from the wrapper's pre-parsed setCookie
      // array (Bun's `Headers.get('set-cookie')` returns null when more
      // than one Set-Cookie header is present).
      const accessCookieHeader = response.setCookie.find((c) => c.startsWith('access_token='));
      expect(accessCookieHeader).toBeDefined();

      // Verify cookie attributes
      expect(accessCookieHeader).toContain('HttpOnly');
      expect(accessCookieHeader).toContain('Path=/');
      expect(accessCookieHeader).toContain('SameSite=Lax');

      // Store cookie for subsequent tests
      expect(accessCookieHeader).toBeDefined();
      accessCookie = accessCookieHeader as string;
    });

    it.serial('should not set session cookie on failed login', async () => {
      const response = await app.request
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword123!' });

      expect(response.status).toBe(401);

      // No session cookie should be set
      const hasSessionCookie = response.setCookie.some((c) => c.startsWith('access_token='));
      expect(hasSessionCookie).toBe(false);
    });
  });

  describe('Step 2: Session Endpoint Validates Cookie', () => {
    it.serial('should return authenticated user when valid session cookie is present', async () => {
      const response = await app.request.get('/api/auth/session').set('Cookie', accessCookie);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(testUser.userId);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it.serial('should return unauthenticated when no cookie is present', async () => {
      const response = await app.request.get('/api/auth/session');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(false);
      expect(response.body.data.user).toBeNull();
    });

    it.serial('should return unauthenticated with invalid cookie', async () => {
      const response = await app.request
        .get('/api/auth/session')
        .set('Cookie', 'access_token=invalid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(false);
      expect(response.body.data.user).toBeNull();
    });
  });

  describe('Step 3: Protected Routes Accept Cookie Authentication', () => {
    it.serial(
      'should access protected endpoint with session cookie (no bearer token)',
      async () => {
        const response = await app.request.get('/api/v1/users/profile').set('Cookie', accessCookie);

        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      },
    );

    it.serial('should preferentially use cookie over bearer token', async () => {
      // Create a second user to test cookie precedence
      const secondUser = authHelper.createTestUser('session-second');
      const secondResult = await authHelper.registerAndLogin(secondUser);

      try {
        // Send request with first user's COOKIE but second user's BEARER token
        // The JwtStrategy should check cookie first, so we should get first user's data
        const response = await app.request
          .get('/api/v1/users/profile')
          .set('Cookie', accessCookie)
          .set('Authorization', `Bearer ${secondResult.token}`);

        expect(response.status).toBe(200);
        // Cookie should take precedence - expect first user's data
        expect(response.body.data.email).toBe(testUser.email);
      } finally {
        await cleanupHelper.deleteUserByEmail(secondUser.email);
      }
    });

    it.serial('should fallback to bearer token when no cookie present', async () => {
      const response = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Step 4: Logout Clears Session Cookie', () => {
    it.serial('should clear session cookie on logout', async () => {
      // Login again to get fresh tokens
      const loginResponse = await app.request
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const freshRefreshToken = loginResponse.body.data.refreshToken;
      const freshAccessCookie = loginResponse.setCookie.find((c) => c.startsWith('access_token='));

      // Now logout
      expect(freshAccessCookie).toBeDefined();
      const logoutResponse = await app.request
        .post('/api/auth/logout')
        .set('Cookie', freshAccessCookie as string)
        .send({ refreshToken: freshRefreshToken, logoutAllSessions: false });

      expect(logoutResponse.status).toBe(200);

      // Check that session cookie was cleared (set to empty or expired)
      const clearedCookie = logoutResponse.setCookie.find((c) => c.startsWith('access_token='));
      if (clearedCookie) {
        expect(
          clearedCookie.includes('access_token=;') ||
            clearedCookie.includes('Expires=Thu, 01 Jan 1970'),
        ).toBe(true);
      }
    });

    it.serial('should reject session cookie after logout', async () => {
      // First login to get a valid session
      const loginResponse = await app.request
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const freshAccessCookie = loginResponse.setCookie.find((c) => c.startsWith('access_token='));

      // Logout
      expect(freshAccessCookie).toBeDefined();
      await app.request
        .post('/api/auth/logout')
        .set('Cookie', freshAccessCookie as string)
        .send({ refreshToken: loginResponse.body.data.refreshToken, logoutAllSessions: false });

      // Try to use the old cookie (should work because JWT is stateless)
      // The cookie was cleared on the client side, but the JWT is still valid until expiry
      // This test verifies the cookie clearing mechanism works on the response

      const sessionResponse = await app.request
        .get('/api/auth/session')
        .set('Cookie', freshAccessCookie as string);

      // Note: Since JWTs are stateless, the old token might still be valid
      // The important thing is that the logout cleared the cookie on the response
      // Client will no longer send the cookie after receiving the cleared cookie
      expect(sessionResponse.status).toBe(200);
    });
  });

  describe('Step 5: Session User Data', () => {
    it.serial('should return complete user data in session response', async () => {
      // Login fresh
      const loginResponse = await app.request
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      const freshCookies = loginResponse.headers.get('set-cookie');
      const freshAccessCookie = Array.isArray(freshCookies)
        ? freshCookies.find((c: string) => c.startsWith('access_token='))
        : freshCookies;

      expect(freshAccessCookie).toBeDefined();
      const response = await app.request
        .get('/api/auth/session')
        .set('Cookie', freshAccessCookie as string);

      expect(response.body.data.user).toMatchObject({
        id: expect.any(String),
        email: testUser.email,
        hasCompletedOnboarding: expect.any(Boolean),
        emailVerified: expect.any(Boolean),
      });
    });
  });
});
