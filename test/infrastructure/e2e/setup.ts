/**
 * E2E Test Setup
 *
 * Creates and configures NestJS application for E2E testing
 */

import { setDefaultTimeout } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import {
  configureExceptionHandling,
  configureValidation,
} from '@/bounded-contexts/platform/common/config/validation.config';
import { EmailSenderService } from '@/bounded-contexts/platform/common/email/services/email-sender.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { parseCookieHeader } from '@/bounded-contexts/platform/common/middleware/cookie-parser.middleware';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AuthHelper } from './helpers/auth.helper';
import { CleanupHelper } from './helpers/cleanup.helper';

/**
 * Mock EmailSenderService for E2E tests
 * Prevents actual email sending and SendGrid dependency
 */
class MockEmailSenderService {
  async sendEmail(): Promise<void> {
    // No-op: Don't actually send emails in E2E tests
    return Promise.resolve();
  }

  async sendTemplatedEmail(): Promise<void> {
    // No-op: Don't actually send emails in E2E tests
    return Promise.resolve();
  }
}

setDefaultTimeout(15000);

let appInstance: INestApplication | null = null;
let authHelperInstance: AuthHelper | null = null;
let cleanupHelperInstance: CleanupHelper | null = null;
let prismaInstance: PrismaService | null = null;

export async function createE2ETestApp(): Promise<{
  app: INestApplication;
  authHelper: AuthHelper;
  cleanupHelper: CleanupHelper;
  prisma: PrismaService;
}> {
  if (appInstance && authHelperInstance && cleanupHelperInstance && prismaInstance) {
    return {
      app: appInstance,
      authHelper: authHelperInstance,
      cleanupHelper: cleanupHelperInstance,
      prisma: prismaInstance,
    };
  }

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailSenderService)
    .useClass(MockEmailSenderService)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');

  // Cookie parser for session-based auth testing — uses lightweight built-in middleware
  app.use(
    (
      req: { cookies?: Record<string, string>; headers: { cookie?: string } },
      _res: unknown,
      next: () => void,
    ) => {
      req.cookies ??= parseCookieHeader(req.headers.cookie);
      next();
    },
  );

  // Apply same configuration as main.ts
  const logger = app.get(AppLoggerService);
  configureValidation(app);
  configureExceptionHandling(app, logger);

  await app.init();

  const prisma = app.get(PrismaService);
  const authHelper = new AuthHelper(app, prisma);
  const cleanupHelper = new CleanupHelper(prisma);

  app.close = async () => undefined;
  appInstance = app;
  prismaInstance = prisma;
  authHelperInstance = authHelper;
  cleanupHelperInstance = cleanupHelper;

  return { app, authHelper, cleanupHelper, prisma };
}
