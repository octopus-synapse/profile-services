/**
 * DSL Smoke Tests
 * End-to-end validation of DSL compilation flow
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import request from 'supertest';
import {
  configureExceptionHandling,
  configureValidation,
} from '@/bounded-contexts/platform/common/config/validation.config';
import { EmailSenderService } from '@/bounded-contexts/platform/common/email/services/email-sender.service';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { AppModule } from '../../src/app.module';
import { createMockResume } from '../factories/resume.factory';
import { createMockUser } from '../factories/user.factory';
import { acceptTosWithPrisma, unwrapApiData } from './setup';

describe('DSL Smoke Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let resumeId: string;
  let themeId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailSenderService)
      .useValue({
        sendEmail: async () => true,
        isConfigured: true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');

    // Apply same configuration as setup.ts
    const logger = app.get(AppLoggerService);
    configureValidation(app);
    configureExceptionHandling(app, logger);

    await app.init();
    app.close = async () => undefined;

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user with hashed password
    // bcrypt hash for 'password'
    const passwordHash = '$2a$10$wziTKTFkXzbG64jFsH0.6Ocq2oGB5biff.ytUoXa14yegt5V8krm.';
    const user = await prisma.user.create({
      data: {
        ...createMockUser({
          email: 'dsl-smoke@test.com',
          passwordHash: passwordHash,
        }),
        emailVerified: new Date(), // Verify email for protected route access
      },
    });
    userId = user.id;

    // Accept ToS for the user (GDPR compliance)
    await acceptTosWithPrisma(prisma, userId);

    // Get auth token
    const authResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
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

    // Create a theme with the valid DSL as styleConfig
    const theme = await prisma.resumeTheme.create({
      data: {
        name: 'Test Theme',
        authorId: userId,
        styleConfig: validDsl as Prisma.InputJsonValue,
      },
    });
    themeId = theme.id;

    const resumeData = createMockResume({ userId });
    const resume = await prisma.resume.create({
      data: {
        ...resumeData,
        contentPtBr: resumeData.contentPtBr as Prisma.InputJsonValue,
        contentEn: resumeData.contentEn as Prisma.InputJsonValue,
        customTheme: validDsl as Prisma.InputJsonValue,
        activeThemeId: themeId,
      },
    });
    resumeId = resume.id;
  }, 20000);

  afterAll(async () => {
    // Cleanup in correct order (foreign key dependencies)
    await prisma.resumeShare.deleteMany({ where: { resumeId } });
    await prisma.resume.deleteMany({ where: { userId } });
    await prisma.resumeTheme.deleteMany({ where: { id: themeId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  }, 20000);

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
          const validation = unwrapApiData<{ valid: boolean; errors: unknown }>(res.body);
          expect(validation.valid).toBe(true);
          expect(validation.errors).toBeNull();
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
          const validation = unwrapApiData<{ valid: boolean; errors: unknown }>(res.body);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeTruthy();
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
          const ast = unwrapApiData<{
            meta: { version: string };
            page: unknown;
            sections: unknown[];
            globalStyles: unknown;
          }>(res.body);
          expect(ast).toBeDefined();
          expect(ast.meta).toBeDefined();
          expect(ast.meta.version).toBe('1.0.0');
          expect(ast.page).toBeDefined();
          expect(ast.sections).toBeInstanceOf(Array);
          expect(ast.globalStyles).toBeDefined();
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
          const ast = unwrapApiData<Record<string, unknown>>(res.body);
          expect(ast).toBeDefined();
          expect(ast.meta).toBeDefined();
          expect(ast.page).toBeDefined();
          expect(ast.sections).toBeInstanceOf(Array);
          expect(ast.globalStyles).toBeDefined();
        });
    });

    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer()).get(`/api/v1/dsl/render/${resumeId}`).expect(401);
    });

    it('should return 400 for non-existent resume', () => {
      return request(app.getHttpServer())
        .get('/api/v1/dsl/render/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('DSL Public Render Endpoint', () => {
    let testSlug: string;

    it('should render public resume AST', async () => {
      // Use unique slug per test run to avoid conflicts
      testSlug = `dsl-smoke-test-${Date.now()}`;

      await prisma.resumeShare.create({
        data: {
          resumeId,
          slug: testSlug,
        },
      });

      const response = await request(app.getHttpServer()).get(
        `/api/v1/dsl/render/public/${testSlug}?target=html`,
      );

      // Log for debugging if not 200
      if (response.status !== 200) {
        console.log('Public render response:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);
      const ast = unwrapApiData<Record<string, unknown>>(response.body);
      expect(ast).toBeDefined();
      expect(ast.meta).toBeDefined();
      expect(ast.page).toBeDefined();
    });

    it('should return 400 for non-public resume', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/dsl/render/public/non-public-dsl-smoke-test')
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
      const validateRes = await request(app.getHttpServer()).post('/api/v1/dsl/validate').send(dsl);

      const validation = unwrapApiData<{ valid: boolean }>(validateRes.body);
      expect(validation.valid).toBe(true);

      // Step 2: Preview (compile without persisting)
      const previewRes = await request(app.getHttpServer())
        .post('/api/v1/dsl/preview?target=html')
        .send(dsl);

      const ast = unwrapApiData<{
        meta: { version: string };
        page: { widthMm: number; heightMm: number; columns: unknown[] };
        sections: unknown[];
        globalStyles: { background: unknown; textPrimary: unknown };
      }>(previewRes.body);
      expect(ast).toBeDefined();

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
