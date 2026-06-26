import { describe, expect, it } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { tokenFromResponse } from '../shared';
import { freshInDbUser } from '../shared/fresh-context';
import { getApp, signupBody, TEST_USER, uniqueTestId } from './setup';

/**
 * Order-independent auth smoke suite. Bun 1.3+ runs a describe's tests
 * concurrently, so the prior version (shared `uniqueEmail` + global
 * `testContext` + a `beforeEach` that re-created one user) raced — most
 * visibly the /refresh test creating a `RefreshToken` for a `testContext.userId`
 * that another file had already deleted (P2003). Each test now provisions its
 * own user. Rate-limited endpoints (signup/login) carry the test-only
 * `x-e2e-bypass-rate-limit` header so concurrent suites don't exhaust the
 * shared IP bucket.
 */

const BYPASS = ['x-e2e-bypass-rate-limit', 'true'] as const;

describe('Auth Smoke Tests', () => {
  describe('POST /api/v1/auth/signup', () => {
    it('should reject duplicate email', async () => {
      const app = await getApp();
      const email = `smoke-dup-${uniqueTestId()}@test.com`;
      const body = signupBody({ email, password: TEST_USER.password, name: TEST_USER.name });

      await app.request
        .post('/api/v1/accounts')
        .set(...BYPASS)
        .send(body)
        .expect(201);
      const res = await app.request
        .post('/api/v1/accounts')
        .set(...BYPASS)
        .send(body);
      expect(res.status).toBe(409);
    });

    it('should reject invalid email format', async () => {
      const app = await getApp();
      const res = await app.request
        .post('/api/v1/accounts')
        .set(...BYPASS)
        .send(
          signupBody({
            email: 'invalid-email',
            password: TEST_USER.password,
            name: TEST_USER.name,
          }),
        );
      expect([400, 422]).toContain(res.status);
    });

    it('should reject weak password', async () => {
      const app = await getApp();
      const res = await app.request
        .post('/api/v1/accounts')
        .set(...BYPASS)
        .send(
          signupBody({
            email: `weak-pass-${uniqueTestId()}@test.com`,
            password: '123',
            name: TEST_USER.name,
          }),
        );
      expect([400, 422]).toContain(res.status);
    });

    it('should create a new user', async () => {
      const app = await getApp();
      const newEmail = `signup-test-${uniqueTestId()}@test.com`;
      const res = await app.request
        .post('/api/v1/accounts')
        .set(...BYPASS)
        .send(signupBody({ email: newEmail, password: TEST_USER.password, name: TEST_USER.name }));

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('userId');
      expect(res.body.email).toBe(newEmail);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const res = await app.request
        .post('/api/v1/auth/login')
        .set(...BYPASS)
        .send({ email: user.email, password: user.password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('userId');
      expect(tokenFromResponse(res, 'access_token')).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const res = await app.request
        .post('/api/v1/auth/login')
        .set(...BYPASS)
        .send({ email: user.email, password: 'wrong-password' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const app = await getApp();
      const res = await app.request
        .post('/api/v1/auth/login')
        .set(...BYPASS)
        .send({ email: `nonexistent-${uniqueTestId()}@test.com`, password: TEST_USER.password });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      const res = await app.request.get('/api/v1/users/profile').set(user.bearer());

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toBe(user.email);
    });

    it('should reject without token', async () => {
      const app = await getApp();
      const res = await app.request.get('/api/v1/users/profile');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const app = await getApp();
      const res = await app.request
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens', async () => {
      const app = await getApp();
      const user = await freshInDbUser(app);
      // Login emits only the access_token cookie now; provision a RefreshToken
      // row directly so /refresh has something to exchange.
      const rawRefresh = `smoke-${randomUUID()}`;
      await app.prisma.refreshToken.create({
        data: {
          token: createHash('sha256').update(rawRefresh).digest('hex'),
          userId: user.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await app.request.post('/api/v1/auth/refresh').send({ refreshToken: rawRefresh });

      expect([200, 201]).toContain(res.status);
      expect(res.body.mode).toBe('tokens');
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const app = await getApp();
      const res = await app.request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('Health Check', () => {
    it('GET /api/health should return healthy status', async () => {
      const app = await getApp();
      const res = await app.request.get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET /api/health/ready should run readiness probes', async () => {
      const app = await getApp();
      const res = await app.request.get('/api/health/ready');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('probes');
    });
  });
});
