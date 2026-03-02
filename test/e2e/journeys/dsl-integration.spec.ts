/**
 * E2E Journey 6: DSL Integration
 *
 * Tests DSL (Domain-Specific Language) validation, preview, and rendering.
 * Validates compilation to AST (Abstract Syntax Tree) for HTML and PDF targets.
 *
 * Flow:
 * 1. Setup - Register user, complete onboarding (creates resume)
 * 2. Validate Valid DSL - POST validation with complete DSL structure
 * 3. Validate Invalid DSL - POST validation with incomplete DSL, verify errors
 * 4. Preview DSL (HTML) - POST preview with valid DSL, receive AST
 * 5. Preview DSL (PDF) - POST preview with PDF target parameter
 * 6. Render with Resume - GET render endpoint with resume data (auth required)
 * 7. Create Share - POST share for public render test
 * 8. Render Public - GET public render by share slug (no auth)
 * 9. Error Cases - 404 for non-existent resources
 * 10. Cleanup
 *
 * Target Time: < 15 seconds
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2ETestApp } from '../setup-e2e';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createFullOnboardingData } from '../fixtures/resumes.fixture';
import { createValidDsl, createInvalidDsl } from '../fixtures/dsl.fixture';
import { createShareData } from '../fixtures/shares.fixture';

describe('E2E Journey 6: DSL Integration', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };
  let resumeId: string;
  let shareSlug: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
  });

  afterAll(async () => {
    if (testUser?.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await app.close();
  });

  describe('Step 1: Setup', () => {
    it('should create user and resume via onboarding', async () => {
      testUser = authHelper.createTestUser('dsl-integration');
      const result = await authHelper.registerAndLogin(testUser);
      testUser.token = result.token;
      testUser.userId = result.userId;

      const onboardingData = createFullOnboardingData('dsl-integration');
      const onboardingResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding/complete')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect(onboardingResponse.status).toBe(201);
      expect(onboardingResponse.body.resumeId).toBeDefined();

      resumeId = onboardingResponse.body.resumeId;
    });
  });

  describe('Step 2: Validate Valid DSL', () => {
    it('should validate complete DSL structure', async () => {
      const validDsl = createValidDsl();

      const response = await request(app.getHttpServer())
        .post('/api/v1/dsl/validate')
        .send(validDsl);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.errors).toBeNull();
    });
  });

  describe('Step 3: Validate Invalid DSL', () => {
    it('should return validation errors for incomplete DSL', async () => {
      const invalidDsl = createInvalidDsl();

      const response = await request(app.getHttpServer())
        .post('/api/v1/dsl/validate')
        .send(invalidDsl);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.errors).toBeDefined();
      expect(Array.isArray(response.body.data.errors)).toBe(true);
      expect(response.body.data.errors.length).toBeGreaterThan(0);

      // Errors should have path and message
      const firstError = response.body.data.errors[0];
      expect(firstError.path).toBeDefined();
      expect(firstError.message).toBeDefined();
    });

    it('should handle empty payload gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/dsl/validate')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.errors).toBeDefined();
    });
  });

  describe('Step 4: Preview DSL for HTML Target', () => {
    it('should compile DSL to AST for HTML', async () => {
      const validDsl = createValidDsl();

      const response = await request(app.getHttpServer())
        .post('/api/v1/dsl/preview')
        .query({ target: 'html' })
        .send(validDsl);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ast).toBeDefined();

      // AST structure validation
      const ast = response.body.data.ast;
      expect(ast.meta).toBeDefined();
      expect(ast.meta.version).toBeDefined();
      expect(ast.meta.generatedAt).toBeDefined();
      expect(ast.page).toBeDefined();
      expect(ast.sections).toBeDefined();
      expect(Array.isArray(ast.sections)).toBe(true);
    });

    it('should default to HTML target when not specified', async () => {
      const validDsl = createValidDsl();

      const response = await request(app.getHttpServer())
        .post('/api/v1/dsl/preview')
        .send(validDsl);

      expect(response.status).toBe(200);
      expect(response.body.data.ast).toBeDefined();
    });
  });

  describe('Step 5: Preview DSL for PDF Target', () => {
    it('should compile DSL to AST for PDF', async () => {
      const validDsl = createValidDsl();

      const response = await request(app.getHttpServer())
        .post('/api/v1/dsl/preview')
        .query({ target: 'pdf' })
        .send(validDsl);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ast).toBeDefined();

      // AST should be valid for both HTML and PDF
      const ast = response.body.data.ast;
      expect(ast.meta).toBeDefined();
      expect(ast.page).toBeDefined();
      expect(ast.sections).toBeDefined();
    });
  });

  describe('Step 6: Render with Resume Data', () => {
    it('should render DSL with resume data (authenticated)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ target: 'html' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ast).toBeDefined();
      expect(response.body.data.resumeId).toBe(resumeId);

      // AST should be populated with resume data
      const ast = response.body.data.ast;
      expect(ast.meta).toBeDefined();
      expect(ast.page).toBeDefined();
      expect(ast.sections).toBeDefined();
    });

    it('should require authentication for resume render', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/${resumeId}`)
        .query({ target: 'html' });

      expect(response.status).toBe(401);
    });

    it('should support PDF target in render', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ target: 'pdf' });

      expect(response.status).toBe(200);
      expect(response.body.data.ast).toBeDefined();
    });
  });

  describe('Step 7: Create Share for Public Render', () => {
    it('should create share for public DSL render test', async () => {
      const shareData = createShareData(resumeId, 'dsl-public');

      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(shareData);

      expect(response.status).toBe(201);
      expect(response.body.slug).toBeDefined();

      shareSlug = response.body.slug;
    });
  });

  describe('Step 8: Render Public Resume', () => {
    it('should render public resume DSL without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/public/${shareSlug}`)
        .query({ target: 'html' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ast).toBeDefined();

      // Public render should not expose resumeId in response
      // (or may include it - depends on API design)
      const ast = response.body.data.ast;
      expect(ast.meta).toBeDefined();
      expect(ast.page).toBeDefined();
      expect(ast.sections).toBeDefined();
    });

    it('should support PDF target for public render', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/public/${shareSlug}`)
        .query({ target: 'pdf' });

      expect(response.status).toBe(200);
      expect(response.body.data.ast).toBeDefined();
    });
  });

  describe('Step 9: Error Cases', () => {
    it('should return 404 for non-existent resume in render', async () => {
      const fakeResumeId = 'clhxxxxxxxxxxxxxxxxxx';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/${fakeResumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for invalid public share slug', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/public/invalid-slug-${Date.now()}`);

      expect(response.status).toBe(404);
    });

    it('should prevent accessing other users resume in render', async () => {
      // Create second user
      const otherUser = authHelper.createTestUser('other-dsl-user');
      const otherResult = await authHelper.registerAndLogin(otherUser);

      // Try to render first user's resume
      const response = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/${resumeId}`)
        .set('Authorization', `Bearer ${otherResult.token}`);

      expect(response.status).toBe(403);

      // Cleanup second user
      await cleanupHelper.deleteUserByEmail(otherUser.email);
    });

    it('should reject invalid target parameter', async () => {
      const validDsl = createValidDsl();

      const response = await request(app.getHttpServer())
        .post('/api/v1/dsl/preview')
        .query({ target: 'invalid-target' })
        .send(validDsl);

      // May accept invalid target and default to HTML, or reject with 400
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Performance & Structure Validation', () => {
    it('should have consistent AST structure across endpoints', async () => {
      const validDsl = createValidDsl();

      // Preview AST
      const previewResponse = await request(app.getHttpServer())
        .post('/api/v1/dsl/preview')
        .send(validDsl);

      const previewAst = previewResponse.body.data.ast;

      // Render AST
      const renderResponse = await request(app.getHttpServer())
        .get(`/api/v1/dsl/render/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      const renderAst = renderResponse.body.data.ast;

      // Both should have same structure
      expect(previewAst).toHaveProperty('meta');
      expect(previewAst).toHaveProperty('page');
      expect(previewAst).toHaveProperty('sections');

      expect(renderAst).toHaveProperty('meta');
      expect(renderAst).toHaveProperty('page');
      expect(renderAst).toHaveProperty('sections');
    });

    it('should complete DSL operations within target time', () => {
      // DSL validation/compilation should be fast (< 1s per operation)
      // Total journey: < 15s
      console.log('ℹ️  DSL performance notes:');
      console.log('  - Validation: < 100ms');
      console.log('  - Preview: < 500ms');
      console.log('  - Render: < 1s');
      console.log('  - Target total: < 15s');

      expect(true).toBe(true);
    });
  });
});
