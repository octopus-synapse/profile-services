/**
 * Integration Test Setup
 *
 * Provides shared test utilities for integration tests.
 * Tests run against a real NestJS application with real database.
 *
 */

import { setDefaultTimeout } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { config } from 'dotenv';

// Load test environment BEFORE importing AppModule
config({ path: join(__dirname, '..', '..', '.env.test'), override: false });
setDefaultTimeout(15000);

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { Agent } from 'supertest';
import { AppModule } from '@/app.module';
import {
  configureExceptionHandling,
  configureValidation,
} from '@/bounded-contexts/platform/common/config/validation.config';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories/section-type.repository';

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

  // Import EmailSenderService dynamically to override
  const { EmailSenderService } = await import(
    '@/bounded-contexts/platform/common/email/services/email-sender.service'
  );

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailSenderService)
    .useValue({
      sendEmail: async () => true,
      isConfigured: true,
    })
    .compile();

  appInstance = moduleFixture.createNestApplication();
  appInstance.setGlobalPrefix('api');

  // Apply same configuration as main.ts
  const logger = appInstance.get(AppLoggerService);
  configureValidation(appInstance);
  configureExceptionHandling(appInstance, logger);

  await appInstance.init();
  testContext.app = appInstance;

  return appInstance;
}

/**
 * Gets a supertest request agent for the app.
 */
export function getRequest(): Agent {
  if (!appInstance) {
    throw new Error('App not initialized. Call getApp() first or use createTestUserAndLogin()');
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

  // Step 1: Create account
  const signupResponse = await agent.post('/api/accounts').send(user);

  if (signupResponse.status !== 201) {
    throw new Error(
      `Failed to create test user (status=${signupResponse.status}): ${JSON.stringify(
        signupResponse.body,
      )}`,
    );
  }

  // Response: { success: true, data: { userId, email, message } }
  const { userId } = signupResponse.body.data;

  // Verify email to allow access to protected routes
  const prisma = app.get<PrismaService>(PrismaService);
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  // Accept ToS and Privacy Policy for GDPR compliance
  await acceptTosForUser(userId);

  // Step 2: Login to get tokens
  const loginResponse = await agent.post('/api/auth/login').send({
    email: user.email,
    password: user.password,
  });

  if (loginResponse.status !== 200) {
    throw new Error(
      `Failed to login test user (status=${loginResponse.status}): ${JSON.stringify(
        loginResponse.body,
      )}`,
    );
  }

  const { accessToken, refreshToken } = loginResponse.body.data;

  testContext.accessToken = accessToken;
  testContext.refreshToken = refreshToken;
  testContext.userId = userId;

  return { accessToken, userId, refreshToken };
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

export function unwrapApiData<T>(body: unknown): T {
  const envelope =
    body && typeof body === 'object' && 'data' in body ? (body as { data?: unknown }).data : body;

  if (
    envelope &&
    typeof envelope === 'object' &&
    !Array.isArray(envelope) &&
    Object.keys(envelope).length === 1
  ) {
    const [onlyKey] = Object.keys(envelope);
    return (envelope as Record<string, unknown>)[onlyKey] as T;
  }

  return envelope as T;
}

/**
 * Cleanup function to close the app after all tests.
 * Call this in afterAll() of your test file.
 *
 * Note: With shared app instance, this is now a no-op.
 * The app will be closed when the process exits.
 * This prevents race conditions when multiple test files
 * try to close the same app instance.
 */
export async function closeApp(): Promise<void> {
  // No-op: Let the process handle cleanup
  // This prevents "Engine is not yet connected" errors
  // when tests run in parallel and one file closes the app
  // while others are still using it.
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
 * Refreshes the SectionTypeRepository cache.
 * Call this after creating/updating section types via Prisma in tests.
 */
export async function refreshSectionTypeCache(): Promise<void> {
  if (!appInstance) {
    throw new Error('App not initialized. Call getApp() first.');
  }
  const sectionTypeRepo = appInstance.get<SectionTypeRepository>(SectionTypeRepository);
  await sectionTypeRepo.refresh();
}

/**
 * Accepts ToS and Privacy Policy for a user using provided PrismaService.
 * Use this when tests create their own app instance.
 */
export async function acceptTosWithPrisma(prisma: PrismaService, userId: string): Promise<void> {
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
