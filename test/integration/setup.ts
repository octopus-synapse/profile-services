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
import { randomUUID } from 'crypto';

// Load test environment BEFORE importing AppModule
config({ path: join(__dirname, '..', '..', '.env.test'), override: false });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Agent } from 'supertest';
import { AppModule } from '../../src/app.module';
import { ZodValidationPipe } from '../../src/common/pipes/zod-validation.pipe';
import { PrismaService } from '../../src/prisma/prisma.service';

// --- Test Constants ---

function uniqueTestEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.com`;
}

export const TEST_USER = {
  email: uniqueTestEmail('integration-test'),
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
  appInstance.useGlobalPipes(new ZodValidationPipe());

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
    email: customUser?.email || uniqueTestEmail('test'),
    password: customUser?.password || TEST_USER.password,
    name: customUser?.name || TEST_USER.name,
  };

  const signupResponse = await agent.post('/api/v1/auth/signup').send(user);

  if (signupResponse.status !== 201) {
    throw new Error(
      `Failed to create test user (status=${signupResponse.status}): ${JSON.stringify(
        signupResponse.body,
      )}`,
    );
  }

  const {
    accessToken,
    refreshToken,
    user: createdUser,
  } = signupResponse.body.data;

  // Verify email to allow access to protected routes
  const prisma = app.get<PrismaService>(PrismaService);
  await prisma.user.update({
    where: { id: createdUser.id },
    data: { emailVerified: new Date() },
  });

  // Accept ToS and Privacy Policy for GDPR compliance
  await acceptTosForUser(createdUser.id);

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

/**
 * Verifies a user's email directly in the database.
 * This bypasses the email verification flow for integration tests.
 */
export async function verifyUserEmail(userId: string): Promise<void> {
  if (!appInstance) {
    throw new Error('App not initialized. Call getApp() first.');
  }
  const prisma = appInstance.get<PrismaService>(PrismaService);
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });
}

/**
 * Accepts ToS and Privacy Policy for a user directly in the database.
 * This bypasses the consent flow for integration tests (GDPR compliance).
 */
export async function acceptTosForUser(userId: string): Promise<void> {
  if (!appInstance) {
    throw new Error('App not initialized. Call getApp() first.');
  }
  const prisma = appInstance.get<PrismaService>(PrismaService);
  const tosVersion = process.env.TOS_VERSION || '1.0.0';
  const privacyPolicyVersion = process.env.PRIVACY_POLICY_VERSION || '1.0.0';

  // Accept Terms of Service
  await prisma.userConsent.upsert({
    where: {
      userId_documentType_version: {
        userId,
        documentType: 'TERMS_OF_SERVICE',
        version: tosVersion,
      },
    },
    update: {},
    create: {
      userId,
      documentType: 'TERMS_OF_SERVICE',
      version: tosVersion,
      ipAddress: '127.0.0.1',
      userAgent: 'Integration Test',
    },
  });

  // Accept Privacy Policy
  await prisma.userConsent.upsert({
    where: {
      userId_documentType_version: {
        userId,
        documentType: 'PRIVACY_POLICY',
        version: privacyPolicyVersion,
      },
    },
    update: {},
    create: {
      userId,
      documentType: 'PRIVACY_POLICY',
      version: privacyPolicyVersion,
      ipAddress: '127.0.0.1',
      userAgent: 'Integration Test',
    },
  });
}

/**
 * Gets the PrismaService instance from the app.
 */
export function getPrisma(): PrismaService {
  if (!appInstance) {
    throw new Error('App not initialized. Call getApp() first.');
  }
  return appInstance.get<PrismaService>(PrismaService);
}

/**
 * Accepts ToS and Privacy Policy for a user using provided PrismaService.
 * Use this when tests create their own app instance.
 */
export async function acceptTosWithPrisma(
  prisma: PrismaService,
  userId: string,
): Promise<void> {
  const tosVersion = process.env.TOS_VERSION || '1.0.0';
  const privacyPolicyVersion = process.env.PRIVACY_POLICY_VERSION || '1.0.0';

  // Accept Terms of Service
  await prisma.userConsent.upsert({
    where: {
      userId_documentType_version: {
        userId,
        documentType: 'TERMS_OF_SERVICE',
        version: tosVersion,
      },
    },
    update: {},
    create: {
      userId,
      documentType: 'TERMS_OF_SERVICE',
      version: tosVersion,
      ipAddress: '127.0.0.1',
      userAgent: 'Integration Test',
    },
  });

  // Accept Privacy Policy
  await prisma.userConsent.upsert({
    where: {
      userId_documentType_version: {
        userId,
        documentType: 'PRIVACY_POLICY',
        version: privacyPolicyVersion,
      },
    },
    update: {},
    create: {
      userId,
      documentType: 'PRIVACY_POLICY',
      version: privacyPolicyVersion,
      ipAddress: '127.0.0.1',
      userAgent: 'Integration Test',
    },
  });
}
