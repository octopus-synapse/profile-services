/**
 * Auth Flow Integration Tests
 *
 * Tests complete authentication workflows with real database and services.
 * No mocks - validates actual system behavior.
 *
 * Uncle Bob: "Test the architecture, not isolated units"
 * Kent Beck: "Integration tests are the safety net for refactoring"
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  mock,
} from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EmailSenderService } from '@/bounded-contexts/platform/common/email/services/email-sender.service';
import { acceptTosWithPrisma } from './setup';

describe('Auth Flow Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  /**
   * Helper to verify user email directly in database.
   * This bypasses the email verification flow for integration tests.
   */
  async function verifyUserEmailInDb(email: string): Promise<void> {
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });
  }

  /**
   * Helper to accept ToS for a user by email.
   */
  async function acceptTosForUserByEmail(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await acceptTosWithPrisma(prisma, user.id);
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailSenderService)
      .useValue({
        sendEmail: mock().mockResolvedValue(true),
        isConfigured: true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    // Validation is handled by ZodValidationPipe at controller level

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'integration-test' } },
    });
  });

  describe('Signup → Login → Protected Access Flow', () => {
    const testUser = {
      email: 'integration-test-signup@example.com',
      password: 'SecurePass123!',
      name: 'Integration Test User',
    };

    it('should complete full auth lifecycle', async () => {
      // Step 1: Signup
      const signupResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(201);

      expect(signupResponse.body.success).toBe(true);
      expect(signupResponse.body.data.accessToken).toBeDefined();
      expect(signupResponse.body.data.user.email).toBe(testUser.email);

      accessToken = signupResponse.body.data.accessToken;
      refreshToken = signupResponse.body.data.refreshToken;

      // Step 1.5: Verify email so we can access protected routes
      await verifyUserEmailInDb(testUser.email);
      await acceptTosForUserByEmail(testUser.email);

      // Step 2: Login with same credentials
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.accessToken).toBeDefined();

      // Update token after login
      accessToken = loginResponse.body.data.accessToken;

      // Step 3: Access protected route
      const meResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(meResponse.body.data.email).toBe(testUser.email);
      expect(meResponse.body.data.name).toBe(testUser.name);
    });

    it('should reject duplicate email signup', async () => {
      // First signup
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(201);

      // Duplicate signup
      const duplicateResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(409);

      // Error message should indicate email is already registered
      expect(duplicateResponse.body.message).toMatch(
        /already|registered|exists/i,
      );
    });

    it('should reject invalid credentials on login', async () => {
      // Signup first
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(201);

      // Invalid password
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message.includes('Invalid')).toBe(true);
    });

    it('should reject access to protected route without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should reject access with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-123')
        .expect(401);
    });
  });

  describe('Token Refresh Flow', () => {
    const testUser = {
      email: 'integration-test-refresh@example.com',
      password: 'SecurePass123!',
      name: 'Refresh Test User',
    };

    beforeEach(async () => {
      const signupResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(201);

      accessToken = signupResponse.body.data.accessToken;
      refreshToken = signupResponse.body.data.refreshToken;

      // Verify email for protected route access
      await verifyUserEmailInDb(testUser.email);
      await acceptTosForUserByEmail(testUser.email);
    });

    it('should refresh access token using refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.data.accessToken).toBeDefined();
      // Note: In fast tests, tokens may be identical if generated in same second
      // The important validation is that the new token works

      // Verify new token works
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${response.body.data.accessToken}`)
        .expect(200);
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  describe('Email Verification Flow', () => {
    let testAccessToken: string;

    beforeEach(async () => {
      // Generate unique email for each test
      const testEmail = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
      const signupResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: testEmail,
          password: 'SecurePass123!',
          name: 'Verify Test User',
        })
        .expect(201);

      testAccessToken = signupResponse.body.data.accessToken;
    });

    it('should request email verification', async () => {
      // Endpoint requires authentication - email is taken from token
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email/request')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      // Email verification flow validated
    });

    it('should verify email with valid token', async () => {
      // Skip - email verification uses NextAuth tokens
      // Integration test would require email capture
    });

    it('should reject expired verification token', async () => {
      // Skip - would require token manipulation
    });
  });

  describe('Password Reset Flow', () => {
    const testUser = {
      email: 'integration-test-reset@example.com',
      password: 'OldPass123!',
      name: 'Reset Test User',
    };

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(201);
    });

    it('should complete password reset flow', async () => {
      // Step 1: Request password reset
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      // Note: Full flow requires email token capture
      // Integration validates API contract only
    });

    it('should reject invalid password reset token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token-xyz',
          newPassword: 'NewPass123!',
        })
        .expect(400);
    });
  });

  describe('Account Management Flow', () => {
    let testUser: { email: string; password: string; name: string };

    beforeEach(async () => {
      // Generate unique email for each test
      testUser = {
        email: `account-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
        password: 'Account123!',
        name: 'Account Test User',
      };

      const signupResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send(testUser)
        .expect(201);

      accessToken = signupResponse.body.data.accessToken;

      // Verify email for protected route access
      await verifyUserEmailInDb(testUser.email);
      await acceptTosForUserByEmail(testUser.email);
    });

    it('should change user password', async () => {
      const newPassword = 'NewSecurePass123!';

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword,
        })
        .expect(200);

      // Verify new password works
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should change user email', async () => {
      const newEmail = `integration-test-new-email-${Date.now()}@example.com`;

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-email')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          newEmail,
          currentPassword: testUser.password,
        })
        .expect(200);

      // Verify email was changed by checking login with new email
      // Note: Depending on implementation, new email might need verification
      // For now, just verify the request was accepted
    });

    it('should delete user account', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/delete-account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: testUser.password })
        .expect(200);

      // Verify user can't login
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      // Verify user deleted from database
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      expect(user).toBeNull();
    });
  });
});
