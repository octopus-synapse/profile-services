/**
 * DSL Smoke Tests
 * End-to-end validation of DSL compilation flow
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createMockResume } from '../factories/resume.factory';
import { createMockUser } from '../factories/user.factory';

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
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user and authenticate
    const user = await prisma.user.create({
      data: createMockUser({ email: 'dsl-smoke@test.com' }),
    });
    userId = user.id;

    // Get auth token (simplified - adjust to your auth flow)
    const authResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'dsl-smoke@test.com', password: 'password' });

    authToken = authResponse.body.accessToken;

    // Create test resume
    const resume = await prisma.resume.create({
      data: createMockResume({ userId }),
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
        .post('/dsl/validate')
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
        .post('/dsl/validate')
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
        .post('/dsl/preview?target=html')
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
        .get(`/dsl/render/${resumeId}?target=html`)
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
        .get(`/dsl/render/${resumeId}`)
        .expect(401);
    });

    it('should return 400 for non-existent resume', () => {
      return request(app.getHttpServer())
        .get('/dsl/render/non-existent-id')
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
        .get('/dsl/render/public/dsl-smoke-test?target=html')
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
        .get('/dsl/render/public/dsl-smoke-test')
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
        .post('/dsl/validate')
        .send(dsl);

      expect(validateRes.body.valid).toBe(true);

      // Step 2: Preview (compile without persisting)
      const previewRes = await request(app.getHttpServer())
        .post('/dsl/preview')
        .send(dsl);

      expect(previewRes.body.ast).toBeDefined();
      const ast = previewRes.body.ast;

      // Step 3: Verify AST structure
      expect(ast.meta.version).toBe('1.0.0');
      expect(ast.page.widthPx).toBeGreaterThan(0);
      expect(ast.page.heightPx).toBeGreaterThan(0);
      expect(ast.page.columns).toBeInstanceOf(Array);
      expect(ast.sections).toBeInstanceOf(Array);
      expect(ast.globalStyles.background).toBeTruthy();
      expect(ast.globalStyles.textPrimary).toBeTruthy();
    });
  });
});
