import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  getRequest,
  getApp,
  closeApp,
  testContext,
  TEST_USER,
  verifyUserEmail,
} from './setup';

describe('Auth Smoke Tests', () => {
  const uniqueEmail = `smoke-auth-${Date.now()}@test.com`;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    await getApp();
    // Pre-create user for all tests
    const res = await getRequest().post('/api/v1/auth/signup').send({
      email: uniqueEmail,
      password: TEST_USER.password,
      name: TEST_USER.name,
    });
    if (res.status === 201) {
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
      testContext.accessToken = accessToken;
      testContext.refreshToken = refreshToken;
      testContext.userId = res.body.data.user.id;

      // Verify email so user can access protected routes
      await verifyUserEmail(testContext.userId);
    }
  });

  afterAll(async () => {
    await closeApp();
  });

  describe('POST /api/auth/signup', () => {
    it('should reject duplicate email', async () => {
      const res = await getRequest().post('/api/v1/auth/signup').send({
        email: uniqueEmail,
        password: TEST_USER.password,
        name: TEST_USER.name,
      });

      expect(res.status).toBe(409);
    });

    it('should reject invalid email format', async () => {
      const res = await getRequest().post('/api/v1/auth/signup').send({
        email: 'invalid-email',
        password: TEST_USER.password,
        name: TEST_USER.name,
      });

      expect(res.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const res = await getRequest()
        .post('/api/v1/auth/signup')
        .send({
          email: `weak-pass-${Date.now()}@test.com`,
          password: '123',
          name: TEST_USER.name,
        });

      expect(res.status).toBe(400);
    });

    it('should create a new user', async () => {
      const newEmail = `signup-test-${Date.now()}@test.com`;
      const res = await getRequest().post('/api/v1/auth/signup').send({
        email: newEmail,
        password: TEST_USER.password,
        name: TEST_USER.name,
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data.user.email).toBe(newEmail);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await getRequest().post('/api/v1/auth/login').send({
        email: uniqueEmail,
        password: TEST_USER.password,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data).toHaveProperty('user');

      // Update tokens
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
      testContext.accessToken = accessToken;
      testContext.refreshToken = refreshToken;
    });

    it('should reject invalid password', async () => {
      const res = await getRequest().post('/api/v1/auth/login').send({
        email: uniqueEmail,
        password: 'wrong-password',
      });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await getRequest().post('/api/v1/auth/login').send({
        email: 'nonexistent@test.com',
        password: TEST_USER.password,
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info', async () => {
      // Ensure we have a fresh token by logging in
      const loginRes = await getRequest().post('/api/v1/auth/login').send({
        email: uniqueEmail,
        password: TEST_USER.password,
      });

      // If login fails, skip this test (user may have been cleaned up)
      if (loginRes.status !== 200) {
        console.log('Login failed, response:', loginRes.body);
        expect(loginRes.status).toBe(200);
        return;
      }

      const token = loginRes.body.data.accessToken;

      const res = await getRequest()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data.email).toBe(uniqueEmail);
    });

    it('should reject without token', async () => {
      const res = await getRequest().get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await getRequest()
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens', async () => {
      // Get fresh token first
      const loginRes = await getRequest().post('/api/v1/auth/login').send({
        email: uniqueEmail,
        password: TEST_USER.password,
      });
      const currentRefreshToken =
        loginRes.body.data?.refreshToken || refreshToken;

      const res = await getRequest().post('/api/v1/auth/refresh').send({
        refreshToken: currentRefreshToken,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');

      // Update tokens for subsequent tests
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
      testContext.accessToken = accessToken;
      testContext.refreshToken = refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const res = await getRequest().post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid-refresh-token',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('Health Check', () => {
    it('GET /api/health should return healthy status', async () => {
      const res = await getRequest().get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('ok');
    });

    it('GET /api/health/db should check database', async () => {
      const res = await getRequest().get('/api/health/db');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('ok');
      expect(res.body.info).toHaveProperty('database');
    });
  });
});
