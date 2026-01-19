/**
 * Resume CRUD Integration Tests
 *
 * Tests complete resume lifecycle with real database.
 * Validates business rules: 4 resume limit, ownership, etc.
 *
 * Kent Beck: "Test behavior, not implementation"
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
import { PrismaService } from '../../src/prisma/prisma.service';
import { acceptTosWithPrisma } from './setup';

describe('Resume CRUD Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: `resume-test-${Date.now()}@example.com`,
    password: 'SecurePass123!',
    name: 'Resume Test User',
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
    // Validation is handled by ZodValidationPipe at controller level

    prisma = app.get<PrismaService>(PrismaService);

    await app.init();

    // Create test user
    const signupResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send(testUser)
      .expect(201);

    accessToken = signupResponse.body.data.accessToken;
    userId = signupResponse.body.data.user.id;

    // Verify email to allow access to protected routes
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    // Accept ToS and Privacy Policy (GDPR compliance)
    await acceptTosWithPrisma(prisma, userId);
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.resume.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({
        where: { email: testUser.email },
      });
    } catch {
      // Ignore cleanup errors
    }
    await app.close();
  });

  afterEach(async () => {
    // Clean up resumes after each test
    await prisma.resume.deleteMany({ where: { userId } });
  });

  describe('Resume Creation', () => {
    it('should create a resume successfully', async () => {
      const resumeData = {
        title: 'My First Resume',
        summary: 'A professional software engineer with experience in...',
        fullName: 'John Doe',
        jobTitle: 'Senior Software Engineer',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(resumeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(resumeData.title);
      expect(response.body.data.fullName).toBe(resumeData.fullName);
    });

    it('should reject resume creation without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .send({ title: 'Unauthorized Resume' })
        .expect(401);
    });
  });

  describe('Resume Retrieval', () => {
    let resumeId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Test Resume for Retrieval',
          fullName: 'Test User',
        })
        .expect(201);

      resumeId = response.body.data.id;
    });

    it('should retrieve own resume by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(resumeId);
      expect(response.body.data.title).toBe('Test Resume for Retrieval');
    });

    it('should list all user resumes', async () => {
      // Create additional resume
      await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Second Resume', fullName: 'Test' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(2);
    });
  });

  describe('Resume Update', () => {
    let resumeId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Resume to Update',
          fullName: 'Original Name',
        })
        .expect(201);

      resumeId = response.body.data.id;
    });

    it('should update resume successfully', async () => {
      const updateData = {
        title: 'Updated Resume Title',
        fullName: 'Updated Name',
        summary: 'New summary content',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.fullName).toBe(updateData.fullName);
    });
  });

  describe('Resume Deletion', () => {
    let resumeId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Resume to Delete',
          fullName: 'Delete Test',
        })
        .expect(201);

      resumeId = response.body.data.id;
    });

    it('should delete own resume', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Resume Limit (Max 4)', () => {
    it('should allow creating up to 4 resumes', async () => {
      for (let i = 1; i <= 4; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/resumes')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: `Resume ${i}`,
            fullName: `User ${i}`,
          })
          .expect(201);
      }

      // Verify all 4 exist
      const response = await request(app.getHttpServer())
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(4);
    });

    it('should reject 5th resume creation', async () => {
      // Create 4 resumes
      for (let i = 1; i <= 4; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/resumes')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            title: `Resume ${i}`,
            fullName: `User ${i}`,
          })
          .expect(201);
      }

      // Try to create 5th
      const response = await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Resume 5',
          fullName: 'User 5',
        })
        .expect(422);

      expect(response.body.error.message.includes('limit')).toBe(true);
    });
  });

  describe('Resume Visibility', () => {
    let resumeId: string;
    let _resumeSlug: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Public Resume Test',
          fullName: 'Public User',
        })
        .expect(201);

      resumeId = response.body.data.id;
      _resumeSlug = response.body.data.slug;
    });

    it('should toggle resume visibility', async () => {
      // Make public
      await request(app.getHttpServer())
        .patch(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isPublic: true })
        .expect(200);

      // Verify it's public
      const response = await request(app.getHttpServer())
        .get(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.isPublic).toBe(true);
    });
  });
});
