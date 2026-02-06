/**
 * E2E Test Auth Helper
 *
 * Provides authentication utilities for E2E tests:
 * - User creation and cleanup
 * - Token management
 * - Session handling
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  token?: string;
  userId?: string;
}

export class AuthHelper {
  constructor(private readonly app: INestApplication) {}

  /**
   * Create a unique test user
   */
  createTestUser(suffix?: string): TestUser {
    const timestamp = Date.now();
    const uniqueSuffix = suffix || timestamp.toString();

    return {
      email: `e2e-test-${uniqueSuffix}@example.com`,
      password: 'TestPassword123!',
      name: `E2E Test User ${uniqueSuffix}`,
    };
  }

  /**
   * Register and login a new user
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

    testUser.token = signupResponse.body.token;
    testUser.userId = signupResponse.body.user?.id;

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

    return response.body.token;
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
   * Accept ToS for user
   */
  async acceptToS(token: string): Promise<void> {
    const tosResponse = await request(this.app.getHttpServer())
      .post('/api/v1/tos/accept')
      .set('Authorization', `Bearer ${token}`)
      .send({
        documentType: 'TERMS_OF_SERVICE',
        version: '1.0',
      });

    if (tosResponse.status !== 201) {
      throw new Error('ToS acceptance failed');
    }

    const privacyResponse = await request(this.app.getHttpServer())
      .post('/api/v1/tos/accept')
      .set('Authorization', `Bearer ${token}`)
      .send({
        documentType: 'PRIVACY_POLICY',
        version: '1.0',
      });

    if (privacyResponse.status !== 201) {
      throw new Error('Privacy policy acceptance failed');
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
