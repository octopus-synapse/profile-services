/**
 * Integration Test Setup
 *
 * Provides shared test utilities for integration tests.
 * Tests run against a real NestJS application with real database.
 *
 * Kent Beck: "Integration tests validate real collaborations"
 * Uncle Bob: "Test setup should be simple and predictable"
 */

import { config } from 'dotenv';
import { join } from 'path';

// Load test environment BEFORE importing AppModule
config({ path: join(__dirname, '..', '..', '.env.test'), override: false });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request, { Agent } from 'supertest';
import { AppModule } from '../../src/app.module';

// --- Test Constants ---

export const TEST_USER = {
  email: `integration-test-${Date.now()}@example.com`,
  password: 'SecurePass123!',
  name: 'Integration Test User',
};

// --- Test Context (shared state between tests) ---

export const testContext: {
  app: INestApplication | null;
  accessToken: string;
  refreshToken: string;
  userId: string;
  resumeId: string;
} = {
  app: null,
  accessToken: '',
  refreshToken: '',
  userId: '',
  resumeId: '',
};

// --- App Instance ---

let appInstance: INestApplication | null = null;

/**
 * Gets or creates the NestJS application instance.
 * Reuses the same instance across all integration tests.
 */
export async function getApp(): Promise<INestApplication> {
  if (appInstance) {
    return appInstance;
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  appInstance = moduleFixture.createNestApplication();
  appInstance.setGlobalPrefix('api');
  appInstance.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await appInstance.init();
  testContext.app = appInstance;

  return appInstance;
}

/**
 * Gets a supertest request agent for the app.
 */
export function getRequest(): Agent {
  if (!appInstance) {
    throw new Error(
      'App not initialized. Call getApp() first or use createTestUserAndLogin()',
    );
  }
  return request(appInstance.getHttpServer());
}

/**
 * Creates a test user and logs them in.
 * Returns the access token and user ID.
 */
export async function createTestUserAndLogin(
  customUser?: Partial<typeof TEST_USER>,
): Promise<{ accessToken: string; userId: string; refreshToken: string }> {
  const app = await getApp();
  const agent = request(app.getHttpServer());

  const user = {
    email: customUser?.email || `test-${Date.now()}@example.com`,
    password: customUser?.password || TEST_USER.password,
    name: customUser?.name || TEST_USER.name,
  };

  const signupResponse = await agent.post('/api/v1/auth/signup').send(user);

  if (signupResponse.status !== 201) {
    throw new Error(
      `Failed to create test user: ${JSON.stringify(signupResponse.body)}`,
    );
  }

  const {
    accessToken,
    refreshToken,
    user: createdUser,
  } = signupResponse.body.data;

  testContext.accessToken = accessToken;
  testContext.refreshToken = refreshToken;
  testContext.userId = createdUser.id;

  return { accessToken, userId: createdUser.id, refreshToken };
}

/**
 * Returns the authorization header for authenticated requests.
 */
export function authHeader(token?: string): { Authorization: string } {
  const actualToken = token || testContext.accessToken;
  if (!actualToken) {
    throw new Error('No access token available. Login first.');
  }
  return { Authorization: `Bearer ${actualToken}` };
}

/**
 * Cleanup function to close the app after all tests.
 * Call this in afterAll() of your test file.
 */
export async function closeApp(): Promise<void> {
  if (appInstance) {
    await appInstance.close();
    appInstance = null;
    testContext.app = null;
  }
}
