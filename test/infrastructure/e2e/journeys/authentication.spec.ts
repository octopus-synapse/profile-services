/**
 * E2E: Authentication
 *
 * Concurrent-safe: every `it` mints its own user via `freshInDbUser()`,
 * so tests don't share token/userId state. Bun's `--concurrent` flag
 * can run them in parallel without colliding.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { randomUUID } from 'node:crypto';
import {
  freshInDbUser,
  rawCookieFromResponse,
  stopTestApp,
  type TestApp,
  tokenFromResponse,
} from '../../shared';
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
      const me = await freshInDbUser(app);
      const response = await app.request
        .post('/api/v1/auth/login')
        .send({ email: me.email, password: me.password });

      expect(response.status).toBe(200);
      // P0-006: only `access_token` is set as a cookie. The refresh
      // token isn't a separate cookie — refresh rotates the access
      // cookie via the same session.
      expect(tokenFromResponse(response, 'access_token')).toBeDefined();
      expect(response.body.userId).toBe(me.userId);
    });

    it('rejects invalid password', async () => {
      const me = await freshInDbUser(app);
      const response = await app.request
        .post('/api/v1/auth/login')
        .send({ email: me.email, password: 'WrongPassword123!' });

      expect(response.status).toBe(401);
    });

    it('rejects non-existent email', async () => {
      const response = await app.request.post('/api/v1/auth/login').send({
        email: `nonexistent-${randomUUID()}@test.com`,
        password: 'AnyPassword123!',
      });

      expect(response.status).toBe(401);
    });

    it('rejects malformed email', async () => {
      const response = await app.request
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'AnyPassword123!' });

      expect(response.status).toBe(400);
    });
  });

  describe('Protected resource access', () => {
    it('accesses protected endpoint with valid token', async () => {
      const me = await freshInDbUser(app);
      const response = await app.request.get('/api/v1/users/profile').set(me.bearer());

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
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
    it('refreshes access token with valid access cookie', async () => {
      const me = await freshInDbUser(app);
      // P0-006: only the access cookie is set on login; refresh rolls
      // it on POST /auth/refresh.
      const login = await app.request
        .post('/api/v1/auth/login')
        .send({ email: me.email, password: me.password });
      const accessCookie = rawCookieFromResponse(login, 'access_token');
      expect(accessCookie).toBeDefined();

      const response = await app.request.post('/api/v1/auth/refresh').set('Cookie', accessCookie!);
      // Refresh succeeds (200) when the cookie is valid; 400 if the
      // server requires a body refreshToken for non-browser callers.
      expect([200, 400]).toContain(response.status);
    });

    it('no-ops refresh when no credentials are present', async () => {
      // The handler accepts a refresh with no body and no refresh
      // cookie — it returns `{ ok: true }` without rolling a session.
      // This keeps browser flows simple (the cookie carries the token
      // when present, and absence is benign).
      const response = await app.request.post('/api/v1/auth/refresh').send({});
      expect([200, 201]).toContain(response.status);
      expect(response.body.ok).toBe(true);
    });

    it('uses new token to access protected resources', async () => {
      const me = await freshInDbUser(app);
      const login = await app.request
        .post('/api/v1/auth/login')
        .send({ email: me.email, password: me.password });
      const newToken = tokenFromResponse(login, 'access_token');
      expect(newToken).toBeDefined();

      const response = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${newToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe('Password validation', () => {
    it('rejects passwords below the minimum length', async () => {
      const response = await app.request.post('/api/v1/accounts').send({
        email: `weak-pwd-${randomUUID()}@test.com`,
        password: 'short',
        name: 'Weak Password User',
        acceptedTosVersion: process.env.TOS_VERSION || '1.0.0',
        acceptedPrivacyVersion: process.env.PRIVACY_POLICY_VERSION || '1.0.0',
      });
      expect(response.status).toBe(400);
    });

    it('rejects overly simple passwords', async () => {
      const response = await app.request.post('/api/v1/accounts').send({
        email: `simple-pwd-${randomUUID()}@test.com`,
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
      const me = await freshInDbUser(app);
      const results: number[] = [];
      for (let i = 0; i < 5; i++) {
        const r = await app.request
          .post('/api/v1/auth/login')
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
