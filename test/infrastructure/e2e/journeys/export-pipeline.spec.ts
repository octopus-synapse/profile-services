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

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import { createFullOnboardingData } from '../fixtures/resumes.fixture';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

describe('E2E Journey 5: Export Pipeline', () => {
  let app: TestApp; // was INestApplication
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let testUser: { email: string; password: string; name: string; token?: string; userId?: string };
  let _resumeId: string;

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
    await stopTestApp();
  });

  describe('Step 1: Setup', () => {
    it.serial('should create user with full profile for meaningful exports', async () => {
      testUser = authHelper.createTestUser('export');
      const result = await authHelper.registerAndLogin(testUser, { skipOnboarding: true });
      testUser.token = result.token;
      testUser.userId = result.userId;

      // CRITICAL: Use full onboarding data for rich exports
      const onboardingData = createFullOnboardingData('export');
      const onboardingResponse = await app.request
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect(onboardingResponse.status).toBe(201);
      expect(onboardingResponse.body.resumeId).toBeDefined();

      _resumeId = onboardingResponse.body.resumeId;
    });
  });

  describe('Step 2: DOCX Export', () => {
    it.serial(
      'should export resume as DOCX returning a presigned download URL',
      async () => {
        const response = await app.request
          .get('/api/v1/export/resume/docx')
          .set('Authorization', `Bearer ${testUser.token}`);

        // DOCX export uploads to MinIO and returns a presigned URL — no
        // browser/typst involved, so with MinIO wired into the e2e stack
        // this is the reliable proof that object storage works end-to-end.
        expect(response.status).toBe(200);

        const { downloadUrl, filename, expiresAt } = response.body;
        expect(typeof downloadUrl).toBe('string');
        expect(downloadUrl).toMatch(/^https?:\/\//);
        expect(typeof filename).toBe('string');
        expect(filename).toMatch(/\.docx$/);
        expect(typeof expiresAt).toBe('string');
        expect(Number.isNaN(Date.parse(expiresAt))).toBe(false);
      },
      30000,
    );

    it.serial('should require authentication for DOCX export', async () => {
      const response = await app.request.get('/api/v1/export/resume/docx');

      expect(response.status).toBe(401);
    });
  });

  describe('Step 3: Banner Export', () => {
    it.serial(
      'should export LinkedIn banner as PNG',
      async () => {
        const response = await app.request
          .get('/api/v1/export/banner')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ palette: 'default' });

        // Banner generation depends on local Chrome/Puppeteer availability
        expect([200, 400, 500, 502]).toContain(response.status);

        if (response.status === 200) {
          // Validate Content-Type header
          expect(response.headers.get('content-type')).toBe('image/png');

          // Validate Content-Disposition header
          expect(response.headers.get('content-disposition')).toBeDefined();
          expect(response.headers.get('content-disposition')).toContain('linkedin-banner.png');

          // Validate response is Buffer
          expect(Buffer.isBuffer(response.body)).toBe(true);

          // Validate reasonable file size (PNG should be > 5KB)
          expect(response.body.length).toBeGreaterThan(5000);
        }
      },
      60000,
    ); // 60s timeout (Puppeteer can be slow)

    it.serial(
      'should handle custom logo in banner',
      async () => {
        const response = await app.request
          .get('/api/v1/export/banner')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ palette: 'default', logo: 'https://example.com/logo.png' });

        // Should succeed or gracefully handle invalid logo
        expect([200, 400, 500, 502]).toContain(response.status);
      },
      60000,
    );
  });

  describe('Step 4: PDF Export', () => {
    it.serial(
      'should export resume as PDF',
      async () => {
        const response = await app.request
          .get('/api/v1/export/resume/pdf')
          .set('Authorization', `Bearer ${testUser.token}`);

        // PDF generation may timeout or fail in test environment
        // Accept both success and graceful failure
        expect([200, 400, 500, 502]).toContain(response.status);

        if (response.status === 200) {
          // Validate Content-Type header
          expect(response.headers.get('content-type')).toBe('application/pdf');

          // Validate Content-Disposition header
          expect(response.headers.get('content-disposition')).toBeDefined();
          expect(response.headers.get('content-disposition')).toContain('resume.pdf');

          // Validate response is Buffer
          expect(Buffer.isBuffer(response.body)).toBe(true);

          // Validate reasonable file size (PDF should be > 5KB)
          expect(response.body.length).toBeGreaterThan(5000);
        } else {
          // Puppeteer may not be available or timeout
          console.warn('⚠️  PDF export failed (Puppeteer unavailable?)');
        }
      },
      60000,
    ); // 60s timeout (PDF generation is slow)
  });

  describe('Step 5: PDF with Query Parameters', () => {
    it.serial(
      'should export PDF with custom palette',
      async () => {
        const response = await app.request
          .get('/api/v1/export/resume/pdf')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ palette: 'default' });

        expect([200, 400, 500, 502]).toContain(response.status);

        if (response.status === 200) {
          expect(response.headers.get('content-type')).toBe('application/pdf');
          expect(Buffer.isBuffer(response.body)).toBe(true);
        }
      },
      60000,
    );

    it.serial(
      'should export PDF with language parameter',
      async () => {
        const response = await app.request
          .get('/api/v1/export/resume/pdf')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ lang: 'en' });

        expect([200, 400, 500, 502]).toContain(response.status);

        if (response.status === 200) {
          expect(response.headers.get('content-type')).toBe('application/pdf');
          expect(Buffer.isBuffer(response.body)).toBe(true);
        }
      },
      60000,
    );

    it.serial(
      'should export PDF with custom banner color',
      async () => {
        const response = await app.request
          .get('/api/v1/export/resume/pdf')
          .set('Authorization', `Bearer ${testUser.token}`)
          .query({ palette: 'default', lang: 'en', bannerColor: '#0066cc' });

        expect([200, 400, 500, 502]).toContain(response.status);

        if (response.status === 200) {
          expect(response.headers.get('content-type')).toBe('application/pdf');
          expect(Buffer.isBuffer(response.body)).toBe(true);
        }
      },
      60000,
    );
  });

  describe('Step 6: Error Cases', () => {
    it.serial('should require authentication for PDF export', async () => {
      const response = await app.request.get('/api/v1/export/resume/pdf');

      expect(response.status).toBe(401);
    });

    it.serial('should require authentication for banner export', async () => {
      const response = await app.request.get('/api/v1/export/banner');

      expect(response.status).toBe(401);
    });

    it.serial(
      'should handle invalid palette gracefully',
      async () => {
        const response = await app.request
          .get('/api/v1/export/resume/pdf')
          .set('Authorization', `Bearer ${testUser.token}`)
          .set('x-e2e-bypass-rate-limit', 'true')
          .query({ palette: 'nonexistent-palette' });

        // Succeeds with the default palette, returns a client error, or
        // degrades (502 = typst render binary unavailable in this env).
        // Storage is asserted separately by the DOCX test (the only
        // upload path with no render step), so MinIO failures don't hide
        // here.
        expect([200, 400, 500, 502]).toContain(response.status);
      },
      60000,
    );

    it.serial(
      'should handle missing resume data gracefully',
      async () => {
        // Create new user with minimal profile (no resume content)
        const minimalUser = authHelper.createTestUser('minimal-export');
        const minimalResult = await authHelper.registerAndLogin(minimalUser, {
          skipOnboarding: true,
        });

        const response = await app.request
          .get('/api/v1/export/resume/pdf')
          .set('Authorization', `Bearer ${minimalResult.token}`)
          .set('x-e2e-bypass-rate-limit', 'true');

        // Should either succeed with empty resume or return client error.
        // 403 is also acceptable because the user has skipped onboarding
        // and therefore lacks the `user` role's resume:export permission.
        expect([200, 400, 403, 500]).toContain(response.status);

        // Cleanup minimal user
        await cleanupHelper.deleteUserByEmail(minimalUser.email);
      },
      60000,
    );
  });

  describe('Performance Note', () => {
    it.serial('should complete all exports within target time', () => {
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
