/**
 * E2E Test Auth Helper
 *
 * Provides authentication utilities for E2E tests:
 * - User creation and cleanup
 * - Token management
 * - Session handling
 */

import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import request from 'supertest';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  token?: string;
  userId?: string;
}

export class AuthHelper {
  constructor(
    private readonly app: INestApplication,
    private readonly prisma?: PrismaService,
  ) {}

  /**
   * Create a unique test user with UUID to prevent collisions
   */
  createTestUser(suffix?: string): TestUser {
    const uuid = randomUUID().slice(0, 8);
    const uniqueSuffix = suffix ? `${suffix}-${uuid}` : uuid;

    return {
      email: `e2e-${uniqueSuffix}@example.com`,
      password: 'TestPassword123!',
      name: `E2E Test User ${uniqueSuffix}`,
    };
  }

  /**
   * Register a new user, verify email, accept ToS, and return ready-to-use token
   */
  async registerAndLogin(user?: TestUser): Promise<TestUser> {
    const testUser = user || this.createTestUser();

    // Register
    const signupResponse = await request(this.app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      });

    if (signupResponse.status !== 201) {
      throw new Error(
        `Signup failed: ${signupResponse.status} - ${JSON.stringify(signupResponse.body)}`,
      );
    }

    // Response format: { success: true, data: { accessToken, refreshToken, user } }
    const responseData = signupResponse.body.data || signupResponse.body;
    testUser.token = responseData.accessToken || responseData.token;
    testUser.userId = responseData.user?.id;

    // Verify email directly in database (simulates email verification)
    if (this.prisma && testUser.userId) {
      await this.prisma.user.update({
        where: { id: testUser.userId },
        data: { emailVerified: new Date() },
      });

      // Accept ToS directly in DB (simulates ToS acceptance)
      // Version must match TOS_VERSION and PRIVACY_POLICY_VERSION config (default: 1.0.0)
      await this.prisma.userConsent.createMany({
        data: [
          {
            userId: testUser.userId,
            documentType: 'TERMS_OF_SERVICE',
            version: '1.0.0',
            acceptedAt: new Date(),
          },
          {
            userId: testUser.userId,
            documentType: 'PRIVACY_POLICY',
            version: '1.0.0',
            acceptedAt: new Date(),
          },
        ],
      });

      // Login again to get a fresh token that reflects the updated state
      const newToken = await this.login(testUser.email, testUser.password);
      testUser.token = newToken;
    }

    return testUser;
  }

  /**
   * Login with existing credentials
   */
  async login(email: string, password: string): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    if (response.status !== 200) {
      throw new Error(
        `Login failed: ${response.status} - ${JSON.stringify(response.body)}`,
      );
    }

    // Response format: { success: true, data: { accessToken, refreshToken, user } }
    const responseData = response.body.data || response.body;
    return responseData.accessToken || responseData.token;
  }

  /**
   * Refresh token
   */
  async refreshToken(token: string): Promise<string> {
    const response = await request(this.app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${token}`);

    if (response.status !== 200) {
      throw new Error('Token refresh failed');
    }

    return response.body.token;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(token: string) {
    const response = await request(this.app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    return response.body;
  }

  /**
   * Accept ToS for user (uses /api/v1/users/me/accept-consent endpoint)
   */
  async acceptToS(token: string): Promise<void> {
    const tosResponse = await request(this.app.getHttpServer())
      .post('/api/v1/users/me/accept-consent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        documentType: 'TERMS_OF_SERVICE',
      });

    if (tosResponse.status !== 201) {
      throw new Error(
        `ToS acceptance failed: ${tosResponse.status} - ${JSON.stringify(tosResponse.body)}`,
      );
    }

    const privacyResponse = await request(this.app.getHttpServer())
      .post('/api/v1/users/me/accept-consent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        documentType: 'PRIVACY_POLICY',
      });

    if (privacyResponse.status !== 201) {
      throw new Error(
        `Privacy policy acceptance failed: ${privacyResponse.status} - ${JSON.stringify(privacyResponse.body)}`,
      );
    }
  }

  /**
   * Request email verification
   */
  async requestEmailVerification(token: string): Promise<void> {
    await request(this.app.getHttpServer())
      .post('/api/v1/auth/verify-email/request')
      .set('Authorization', `Bearer ${token}`);
  }
}
