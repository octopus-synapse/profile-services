/**
 * E2E: Authentication
 *
 * Concurrent-safe: every `it` mints its own user via `freshUser()`,
 * so tests don't share token/userId state. Bun's `--concurrent` flag
 * can run them in parallel without colliding.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { freshUser, stopTestApp, type TestApp } from '../../shared';
import { createE2ETestApp } from '../setup';

describe('E2E: Authentication', () => {
  let app: TestApp;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
  });

  afterAll(async () => {
    await stopTestApp();
  });

  describe('Login flow', () => {
    it('logs in with valid credentials', async () => {
      const me = await freshUser(app);
      const response = await app.request
        .post('/api/auth/login')
        .send({ email: me.email, password: me.password });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.userId).toBe(me.userId);
    });

    it('rejects invalid password', async () => {
      const me = await freshUser(app);
      const response = await app.request
        .post('/api/auth/login')
        .send({ email: me.email, password: 'WrongPassword123!' });

      expect(response.status).toBe(401);
    });

    it('rejects non-existent email', async () => {
      const response = await app.request.post('/api/auth/login').send({
        email: `nonexistent-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
        password: 'AnyPassword123!',
      });

      expect(response.status).toBe(401);
    });

    it('rejects malformed email', async () => {
      const response = await app.request
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'AnyPassword123!' });

      expect(response.status).toBe(400);
    });
  });

  describe('Protected resource access', () => {
    it('accesses protected endpoint with valid token', async () => {
      const me = await freshUser(app);
      const response = await app.request.get('/api/v1/users/profile').set(me.bearer());

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('rejects request without token', async () => {
      const response = await app.request.get('/api/v1/users/profile');
      expect(response.status).toBe(401);
    });

    it('rejects request with invalid token', async () => {
      const response = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token');
      expect(response.status).toBe(401);
    });

    it('rejects request with malformed Authorization header', async () => {
      const response = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', 'InvalidFormat');
      expect(response.status).toBe(401);
    });

    it('rejects expired token', async () => {
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid';
      const response = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(response.status).toBe(401);
    });
  });

  describe('Token refresh', () => {
    it('refreshes access token with valid refresh token', async () => {
      const me = await freshUser(app);
      // Login to obtain a refresh token (the helper holds the cookie
      // but the refresh endpoint expects the body field).
      const login = await app.request
        .post('/api/auth/login')
        .send({ email: me.email, password: me.password });
      const refreshToken = login.body.data?.refreshToken;
      expect(refreshToken).toBeDefined();

      const response = await app.request.post('/api/auth/refresh').send({ refreshToken });
      expect(response.status).toBe(200);
      expect(response.body.data?.accessToken).toBeDefined();
    });

    it('rejects invalid refresh token', async () => {
      const response = await app.request
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });
      expect(response.status).toBe(401);
    });

    it('uses new token to access protected resources', async () => {
      const me = await freshUser(app);
      const login = await app.request
        .post('/api/auth/login')
        .send({ email: me.email, password: me.password });
      const newToken = login.body.data?.accessToken as string;
      expect(newToken).toBeDefined();

      const response = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${newToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe('Password validation', () => {
    it('rejects passwords below the minimum length', async () => {
      const response = await app.request.post('/api/accounts').send({
        email: `weak-pwd-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
        password: 'short',
        name: 'Weak Password User',
        acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
        acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
      });
      expect(response.status).toBe(400);
    });

    it('rejects overly simple passwords', async () => {
      const response = await app.request.post('/api/accounts').send({
        email: `simple-pwd-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
        password: 'password',
        name: 'Simple Password User',
        acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
        acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Failed-login throttling', () => {
    it('handles multiple wrong-password attempts gracefully', async () => {
      const me = await freshUser(app);
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const r = await app.request
          .post('/api/auth/login')
          .send({ email: me.email, password: 'WrongPassword123!' });
        results.push(r.status);
      }
      // Each attempt is either a wrong-password 401 or — once the
      // failure window fills up — a rate-limited 429 / locked 423.
      for (const status of results) {
        expect([401, 423, 429]).toContain(status);
      }
    });
  });
});
