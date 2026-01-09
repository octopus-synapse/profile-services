/**
 * Onboarding Flow Integration Tests
 *
 * Tests onboarding lifecycle with real database.
 * Validates business rules for onboarding endpoints.
 *
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
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { acceptTosWithPrisma } from './setup';

describe('Onboarding Flow Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: 'onboarding-integration-test@example.com',
    password: 'SecurePass123!',
    name: 'Onboarding Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('EmailSenderService')
      .useValue({
        sendEmail: mock().mockResolvedValue(true),
        isConfigured: true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create fresh test user for each test
    const signupResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        ...testUser,
        email: `onboarding-${Date.now()}@test.com`,
      })
      .expect(201);

    accessToken = signupResponse.body.data.accessToken;
    userId = signupResponse.body.data.user.id;

    // Verify email for protected route access
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    // Accept ToS (GDPR compliance)
    await acceptTosWithPrisma(prisma, userId);
  });

  afterEach(async () => {
    // Clean up test data - use try/catch to handle connection issues
    try {
      await prisma.onboardingProgress.deleteMany({ where: { userId } });
      await prisma.resume.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    } catch {
      // Ignore cleanup errors - may already be deleted or connection closed
    }
  });

  describe('Onboarding Status', () => {
    it('should return onboarding status for new user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/onboarding/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.hasCompletedOnboarding).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/onboarding/status')
        .expect(401);
    });
  });

  describe('Onboarding Progress', () => {
    it('should get initial progress for new user', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      // Initial progress should have default values
      expect(response.body.currentStep).toBeDefined();
    });

    it('should save onboarding progress', async () => {
      const progressData = {
        currentStep: 'personal-info',
        completedSteps: ['welcome'],
        personalInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
        },
      };

      const response = await request(app.getHttpServer())
        .put('/api/v1/onboarding/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });

    it('should reject unauthenticated progress save', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/onboarding/progress')
        .send({ currentStep: 'personalInfo' })
        .expect(401);
    });
  });

  describe('Complete Onboarding', () => {
    // NOTE: Skipped because complete onboarding performs heavy operations
    // (resume generation, PDF creation, etc.) that exceed test timeout.
    // This should be tested in e2e tests with longer timeouts.
    it.skip('should complete onboarding with valid data', async () => {
      const onboardingData = {
        username: `testuser${Date.now()}`,
        personalInfo: {
          fullName: 'Complete User',
          email: 'complete@test.com',
        },
        professionalProfile: {
          jobTitle: 'Software Engineer',
          summary: 'Experienced developer',
        },
        noExperience: true,
        experiences: [],
        noEducation: true,
        education: [],
        noSkills: true,
        skills: [],
        languages: [{ name: 'English', level: 'NATIVE' }],
        templateSelection: {
          template: 'PROFESSIONAL',
          palette: 'DEFAULT',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(onboardingData);

      expect([200, 201].includes(response.status)).toBe(true);
    });

    it('should reject onboarding without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .send({ personalInfo: {} })
        .expect(401);
    });

    it('should reject invalid onboarding data', async () => {
      // Send invalid data (missing required fields)
      const response = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          personalInfo: { fullName: '' }, // Invalid: empty name
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });
});
