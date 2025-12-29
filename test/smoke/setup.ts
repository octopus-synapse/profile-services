import { config } from 'dotenv';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';

// Load .env.test file before tests run
config({ path: join(__dirname, '..', '..', '.env.test') });

// Global test timeout
jest.setTimeout(30000);

// Test app instance (shared across tests)
let app: INestApplication;
let testModule: TestingModule;

// Test user credentials
export const TEST_USER = {
  email: `smoke-test-${Date.now()}@test.com`,
  password: 'Test@123456',
  name: 'Smoke Test User',
};

// Store tokens and IDs for cross-test usage
export const testContext: {
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
  resumeId?: string;
} = {};

/**
 * Initialize the NestJS application for testing
 */
export async function initializeApp(): Promise<INestApplication> {
  if (app) return app;

  testModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = testModule.createNestApplication();

  // Apply same configuration as main.ts
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  return app;
}

/**
 * Get the initialized app instance
 */
export function getApp(): INestApplication {
  if (!app) {
    throw new Error('App not initialized. Call initializeApp() first.');
  }
  return app;
}

/**
 * Get supertest request instance
 */
export function getRequest() {
  return request(getApp().getHttpServer());
}

/**
 * Close the application after tests
 */
export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = undefined as unknown as INestApplication;
  }
}

/**
 * Create a test user and get authentication tokens
 */
export async function createTestUserAndLogin(): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
}> {
  const req = getRequest();

  // Sign up
  const signupRes = await req.post('/api/auth/signup').send({
    email: TEST_USER.email,
    password: TEST_USER.password,
    name: TEST_USER.name,
  });

  if (signupRes.status !== 201) {
    // User might already exist, try login
    const loginRes = await req.post('/api/auth/login').send({
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    if (loginRes.status !== 200 && loginRes.status !== 201) {
      throw new Error(`Failed to create/login test user: ${JSON.stringify(loginRes.body)}`);
    }

    testContext.accessToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;
    testContext.refreshToken = loginRes.body.data?.refreshToken || loginRes.body.refreshToken;
    testContext.userId = loginRes.body.data?.user?.id || loginRes.body.user?.id;
  } else {
    testContext.accessToken = signupRes.body.data?.accessToken || signupRes.body.accessToken;
    testContext.refreshToken = signupRes.body.data?.refreshToken || signupRes.body.refreshToken;
    testContext.userId = signupRes.body.data?.user?.id || signupRes.body.user?.id;
  }

  return {
    accessToken: testContext.accessToken!,
    refreshToken: testContext.refreshToken!,
    userId: testContext.userId!,
  };
}

/**
 * Get authorization header
 */
export function authHeader(): { Authorization: string } {
  if (!testContext.accessToken) {
    throw new Error('No access token. Call createTestUserAndLogin() first.');
  }
  return { Authorization: `Bearer ${testContext.accessToken}` };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  // Delete test resume if exists
  if (testContext.resumeId && testContext.accessToken) {
    try {
      await getRequest()
        .delete(`/api/resumes/${testContext.resumeId}`)
        .set(authHeader());
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Global hooks
beforeAll(async () => {
  await initializeApp();
});

afterAll(async () => {
  await cleanupTestData();
  await closeApp();
});
