/**
 * DSL Smoke Tests
 * End-to-end validation of DSL compilation flow
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { createMockResume } from '../factories/resume.factory';
import { createMockUser } from '../factories/user.factory';
import { acceptTosWithPrisma } from './setup';

describe('DSL Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let resumeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as setup.ts
    app.setGlobalPrefix('api');
    // Validation is handled by ZodValidationPipe at controller level

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user with hashed password
    // bcrypt hash for 'password'
    const passwordHash =
      '$2a$10$wziTKTFkXzbG64jFsH0.6Ocq2oGB5biff.ytUoXa14yegt5V8krm.';
    const user = await prisma.user.create({
      data: {
        ...createMockUser({
          email: 'dsl-smoke@test.com',
          password: passwordHash,
        }),
        emailVerified: new Date(), // Verify email for protected route access
      },
    });
    userId = user.id;

    // Accept ToS for the user (GDPR compliance)
    await acceptTosWithPrisma(prisma, userId);

    // Get auth token
    const authResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'dsl-smoke@test.com', password: 'password' });

    authToken = authResponse.body.data.accessToken;

    // Create test resume with valid DSL
    const validDsl = {
      version: '1.0.0',
      layout: {
        type: 'single-column',
        paperSize: 'a4',
        margins: 'normal',
        pageBreakBehavior: 'auto',
      },
      tokens: {
        colors: {
          colors: {
            primary: '#0066cc',
            secondary: '#666666',
            background: '#ffffff',
            surface: '#f9fafb',
            text: {
              primary: '#1a1a1a',
              secondary: '#666666',
              accent: '#0066cc',
            },
            border: '#e5e7eb',
            divider: '#e5e7eb',
          },
          borderRadius: 'sm',
          shadows: 'none',
        },
        typography: {
          fontFamily: { heading: 'inter', body: 'inter' },
          fontSize: 'base',
          headingStyle: 'bold',
        },
        spacing: {
          density: 'comfortable',
          sectionGap: 'md',
          itemGap: 'sm',
          contentPadding: 'md',
        },
      },
      sections: [],
    };

    const resumeData = createMockResume({ userId });
    const resume = await prisma.resume.create({
      data: {
        ...resumeData,
        contentPtBr: resumeData.contentPtBr as Prisma.InputJsonValue,
        contentEn: resumeData.contentEn as Prisma.InputJsonValue,
        customTheme: validDsl as Prisma.InputJsonValue,
      },
    });
    resumeId = resume.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.resume.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  describe('DSL Validation Endpoint', () => {
    it('should validate valid DSL', () => {
      const validDsl = {
        version: '1.0.0',
        layout: {
          type: 'single-column',
          paperSize: 'a4',
          margins: 'normal',
          pageBreakBehavior: 'auto',
        },
        tokens: {
          colors: {
            colors: {
              primary: '#0066cc',
              secondary: '#666666',
              background: '#ffffff',
              surface: '#f9fafb',
              text: {
                primary: '#1a1a1a',
                secondary: '#666666',
                accent: '#0066cc',
              },
              border: '#e5e7eb',
              divider: '#e5e7eb',
            },
            borderRadius: 'sm',
            shadows: 'none',
          },
          typography: {
            fontFamily: { heading: 'inter', body: 'inter' },
            fontSize: 'base',
            headingStyle: 'bold',
          },
          spacing: {
            density: 'comfortable',
            sectionGap: 'md',
            itemGap: 'sm',
            contentPadding: 'md',
          },
        },
        sections: [],
      };

      return request(app.getHttpServer())
        .post('/api/v1/dsl/validate')
        .send(validDsl)
        .expect(201)
        .expect((res) => {
          expect(res.body.valid).toBe(true);
          expect(res.body.errors).toBeNull();
        });
    });

    it('should reject invalid DSL', () => {
      const invalidDsl = {
        version: '1.0.0',
        // missing required fields
      };

      return request(app.getHttpServer())
        .post('/api/v1/dsl/validate')
        .send(invalidDsl)
        .expect(201)
        .expect((res) => {
          expect(res.body.valid).toBe(false);
          expect(res.body.errors).toBeTruthy();
        });
    });
  });

  describe('DSL Preview Endpoint', () => {
    it('should compile DSL to AST without persisting', () => {
      const validDsl = {
        version: '1.0.0',
        layout: {
          type: 'single-column',
          paperSize: 'a4',
          margins: 'normal',
          pageBreakBehavior: 'auto',
        },
        tokens: {
          colors: {
            colors: {
              primary: '#0066cc',
              secondary: '#666666',
              background: '#ffffff',
              surface: '#f9fafb',
              text: {
                primary: '#1a1a1a',
                secondary: '#666666',
                accent: '#0066cc',
              },
              border: '#e5e7eb',
              divider: '#e5e7eb',
            },
            borderRadius: 'sm',
            shadows: 'none',
          },
          typography: {
            fontFamily: { heading: 'inter', body: 'inter' },
            fontSize: 'base',
            headingStyle: 'bold',
          },
          spacing: {
            density: 'comfortable',
            sectionGap: 'md',
            itemGap: 'sm',
            contentPadding: 'md',
          },
        },
        sections: [],
      };

      return request(app.getHttpServer())
        .post('/api/v1/dsl/preview?target=html')
        .send(validDsl)
        .expect(201)
        .expect((res) => {
          expect(res.body.ast).toBeDefined();
          expect(res.body.ast.meta).toBeDefined();
          expect(res.body.ast.meta.version).toBe('1.0.0');
          expect(res.body.ast.page).toBeDefined();
          expect(res.body.ast.sections).toBeInstanceOf(Array);
          expect(res.body.ast.globalStyles).toBeDefined();
        });
    });
  });

  describe('DSL Render Endpoint (Authenticated)', () => {
    it('should render resume AST for authenticated user', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/dsl/render/${resumeId}?target=html`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.ast).toBeDefined();
          expect(res.body.resumeId).toBe(resumeId);
          expect(res.body.ast.meta).toBeDefined();
          expect(res.body.ast.page).toBeDefined();
          expect(res.body.ast.sections).toBeInstanceOf(Array);
          expect(res.body.ast.globalStyles).toBeDefined();
        });
    });

    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/dsl/render/${resumeId}`)
        .expect(401);
    });

    it('should return 400 for non-existent resume', () => {
      return request(app.getHttpServer())
        .get('/api/v1/dsl/render/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('DSL Public Render Endpoint', () => {
    it('should render public resume AST', async () => {
      // Make resume public
      await prisma.resume.update({
        where: { id: resumeId },
        data: { isPublic: true, slug: 'dsl-smoke-test' },
      });

      return request(app.getHttpServer())
        .get('/api/v1/dsl/render/public/dsl-smoke-test?target=html')
        .expect(200)
        .expect((res) => {
          expect(res.body.ast).toBeDefined();
          expect(res.body.slug).toBe('dsl-smoke-test');
          expect(res.body.ast.meta).toBeDefined();
          expect(res.body.ast.page).toBeDefined();
        });
    });

    it('should return 400 for non-public resume', async () => {
      // Make resume private
      await prisma.resume.update({
        where: { id: resumeId },
        data: { isPublic: false },
      });

      return request(app.getHttpServer())
        .get('/api/v1/dsl/render/public/dsl-smoke-test')
        .expect(400);
    });
  });

  describe('Full DSL Flow (Validation → Compilation → Rendering)', () => {
    it('should complete full DSL workflow', async () => {
      const dsl = {
        version: '1.0.0',
        layout: {
          type: 'single-column',
          paperSize: 'a4',
          margins: 'normal',
          pageBreakBehavior: 'auto',
        },
        tokens: {
          colors: {
            colors: {
              primary: '#0066cc',
              secondary: '#666666',
              background: '#ffffff',
              surface: '#f9fafb',
              text: {
                primary: '#1a1a1a',
                secondary: '#666666',
                accent: '#0066cc',
              },
              border: '#e5e7eb',
              divider: '#e5e7eb',
            },
            borderRadius: 'sm',
            shadows: 'none',
          },
          typography: {
            fontFamily: { heading: 'inter', body: 'inter' },
            fontSize: 'base',
            headingStyle: 'bold',
          },
          spacing: {
            density: 'comfortable',
            sectionGap: 'md',
            itemGap: 'sm',
            contentPadding: 'md',
          },
        },
        sections: [],
      };

      // Step 1: Validate
      const validateRes = await request(app.getHttpServer())
        .post('/api/v1/dsl/validate')
        .send(dsl);

      expect(validateRes.body.valid).toBe(true);

      // Step 2: Preview (compile without persisting)
      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/dsl/preview?target=html')
        .send(dsl);

      expect(previewRes.body.ast).toBeDefined();
      const ast = previewRes.body.ast;

      // Step 3: Verify AST structure
      expect(ast.meta.version).toBe('1.0.0');
      expect(ast.page.widthMm).toBeGreaterThan(0);
      expect(ast.page.heightMm).toBeGreaterThan(0);
      expect(ast.page.columns).toBeInstanceOf(Array);
      expect(ast.sections).toBeInstanceOf(Array);
      expect(ast.globalStyles.background).toBeTruthy();
      expect(ast.globalStyles.textPrimary).toBeTruthy();
    });
  });
});
