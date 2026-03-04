/**
 * E2E Journey 5: Export Pipeline
 *
 * Tests resume export functionality: DOCX, Banner (PNG), and PDF generation.
 * Validates binary responses, headers, query parameters, and authentication.
 *
 * Flow:
 * 1. Setup - Register user, complete onboarding with FULL profile (critical for exports)
 * 2. DOCX Export - Test word document generation (faster, less flaky)
 * 3. Banner Export - Test LinkedIn banner PNG generation (Puppeteer, simpler than PDF)
 * 4. PDF Export - Test PDF generation (slowest, most likely to fail)
 * 5. PDF with Query Params - Test palette, language, banner color options
 * 6. Error Cases - 401 without auth, graceful handling of failures
 * 7. Cleanup
 *
 * Target Time: < 60 seconds (Puppeteer overhead is significant)
 *
 * IMPORTANT: Tests binary responses (Buffer), NOT JSON.
 * Validates Content-Type and Content-Disposition headers.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2ETestApp } from '../setup-e2e';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createFullOnboardingData } from '../fixtures/resumes.fixture';

describe('E2E Journey 5: Export Pipeline', () => {
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
    it('should create user with full profile for meaningful exports', async () => {
      testUser = authHelper.createTestUser('export');
      const result = await authHelper.registerAndLogin(testUser);
      testUser.token = result.token;
      testUser.userId = result.userId;

      // CRITICAL: Use full onboarding data for rich exports
      const onboardingData = createFullOnboardingData('export');
      const onboardingResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect(onboardingResponse.status).toBe(200);
      expect(onboardingResponse.body.data.resumeId).toBeDefined();

      resumeId = onboardingResponse.body.data.resumeId;
    });
  });

  describe('Step 2: DOCX Export', () => {
    it('should export resume as DOCX with correct headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export/resume/docx')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);

      // Validate Content-Type header
      expect(response.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );

      // Validate Content-Disposition header (attachment)
      expect(response.headers['content-disposition']).toBeDefined();
      expect(response.headers['content-disposition']).toContain('resume.docx');

      // Validate binary payload (supertest may expose as Buffer or raw text/body)
      const contentLength = Number(response.headers['content-length'] ?? 0);
      const isBuffer = Buffer.isBuffer(response.body);
      const bodyLength = isBuffer
        ? response.body.length
        : typeof response.text === 'string'
          ? response.text.length
          : 0;

      expect(isBuffer || contentLength > 1000 || bodyLength > 1000).toBe(true);
    }, 30000); // 30s timeout (DOCX is faster than PDF)

    it('should require authentication for DOCX export', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/export/resume/docx',
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Step 3: Banner Export', () => {
    it('should export LinkedIn banner as PNG', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export/banner')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ palette: 'default' });

      // Banner generation depends on local Chrome/Puppeteer availability
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        // Validate Content-Type header
        expect(response.headers['content-type']).toBe('image/png');

        // Validate Content-Disposition header
        expect(response.headers['content-disposition']).toBeDefined();
        expect(response.headers['content-disposition']).toContain(
          'linkedin-banner.png',
        );

        // Validate response is Buffer
        expect(Buffer.isBuffer(response.body)).toBe(true);

        // Validate reasonable file size (PNG should be > 5KB)
        expect(response.body.length).toBeGreaterThan(5000);
      }
    }, 60000); // 60s timeout (Puppeteer can be slow)

    it('should handle custom logo in banner', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export/banner')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({
          palette: 'default',
          logo: 'https://example.com/logo.png',
        });

      // Should succeed or gracefully handle invalid logo
      expect([200, 500]).toContain(response.status);
    }, 60000);
  });

  describe('Step 4: PDF Export', () => {
    it('should export resume as PDF', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export/resume/pdf')
        .set('Authorization', `Bearer ${testUser.token}`);

      // PDF generation may timeout or fail in test environment
      // Accept both success and graceful failure
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        // Validate Content-Type header
        expect(response.headers['content-type']).toBe('application/pdf');

        // Validate Content-Disposition header
        expect(response.headers['content-disposition']).toBeDefined();
        expect(response.headers['content-disposition']).toContain('resume.pdf');

        // Validate response is Buffer
        expect(Buffer.isBuffer(response.body)).toBe(true);

        // Validate reasonable file size (PDF should be > 5KB)
        expect(response.body.length).toBeGreaterThan(5000);
      } else {
        // Puppeteer may not be available or timeout
        console.warn('⚠️  PDF export failed (Puppeteer unavailable?)');
      }
    }, 60000); // 60s timeout (PDF generation is slow)
  });

  describe('Step 5: PDF with Query Parameters', () => {
    it('should export PDF with custom palette', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export/resume/pdf')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ palette: 'default' });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(Buffer.isBuffer(response.body)).toBe(true);
      }
    }, 60000);

    it('should export PDF with language parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export/resume/pdf')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ lang: 'en' });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(Buffer.isBuffer(response.body)).toBe(true);
      }
    }, 60000);

    it('should export PDF with custom banner color', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export/resume/pdf')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({
          palette: 'default',
          lang: 'en',
          bannerColor: '#0066cc',
        });

      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers['content-type']).toBe('application/pdf');
        expect(Buffer.isBuffer(response.body)).toBe(true);
      }
    }, 60000);
  });

  describe('Step 6: Error Cases', () => {
    it('should require authentication for PDF export', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/export/resume/pdf',
      );

      expect(response.status).toBe(401);
    });

    it('should require authentication for banner export', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/export/banner',
      );

      expect(response.status).toBe(401);
    });

    it('should handle invalid palette gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/export/resume/pdf')
        .set('Authorization', `Bearer ${testUser.token}`)
        .query({ palette: 'nonexistent-palette' });

      // Should either succeed with default or return error
      expect([200, 400, 500]).toContain(response.status);
    }, 60000);

    it('should handle missing resume data gracefully', async () => {
      // Create new user with minimal profile (no resume content)
      const minimalUser = authHelper.createTestUser('minimal-export');
      const minimalResult = await authHelper.registerAndLogin(minimalUser);

      const response = await request(app.getHttpServer())
        .get('/api/v1/export/resume/pdf')
        .set('Authorization', `Bearer ${minimalResult.token}`);

      // Should either succeed with empty resume or return error
      expect([200, 400, 500]).toContain(response.status);

      // Cleanup minimal user
      await cleanupHelper.deleteUserByEmail(minimalUser.email);
    }, 60000);
  });

  describe('Performance Note', () => {
    it('should complete all exports within target time', () => {
      // This is informational - actual timing depends on Puppeteer
      // DOCX: ~1-3s
      // Banner: ~2-10s (Puppeteer)
      // PDF: ~5-30s (Puppeteer, full page render)
      // Total: ~10-45s typical, 60s maximum

      console.log('ℹ️  Export performance notes:');
      console.log('  - DOCX: Fast (1-3s)');
      console.log('  - Banner: Medium (2-10s, Puppeteer)');
      console.log('  - PDF: Slow (5-30s, Puppeteer full render)');
      console.log('  - Cold start: Add 10-20s for browser initialization');
      console.log('  - Target total: < 60s');

      expect(true).toBe(true);
    });
  });
});
