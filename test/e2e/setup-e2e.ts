/**
 * E2E Test Setup
 *
 * Creates and configures NestJS application for E2E testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EmailSenderService } from '@/bounded-contexts/platform/common/email/services/email-sender.service';
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

export async function createE2ETestApp(): Promise<{
  app: INestApplication;
  authHelper: AuthHelper;
  cleanupHelper: CleanupHelper;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailSenderService)
    .useClass(MockEmailSenderService)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply same configuration as main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api');

  await app.init();

  const prisma = app.get(PrismaService);
  const authHelper = new AuthHelper(app);
  const cleanupHelper = new CleanupHelper(prisma);

  return { app, authHelper, cleanupHelper, prisma };
}
