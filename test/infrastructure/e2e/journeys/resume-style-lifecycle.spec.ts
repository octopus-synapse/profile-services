/**
 * E2E Journey: Resume Style Lifecycle
 *
 *   GET    /api/v1/resume-styles                    list (paginated)
 *   GET    /api/v1/resume-styles/:id                detail
 *   GET    /api/v1/resume-styles/:id/preview.pdf    binary preview
 *   POST   /api/v1/resumes/:resumeId/style          apply to a resume
 *   POST   /api/v1/admin/resume-styles              create (admin)
 *   PATCH  /api/v1/admin/resume-styles/:id          update (admin)
 *   DELETE /api/v1/admin/resume-styles/:id          delete (admin)
 *
 * Apply lives on the resumes BC and writes Resume.styleId. Admin CRUD
 * is gated by Permission.ADMIN_FULL_ACCESS (auto-granted to role
 * `admin` via the enum-derived seed). System styles (seeded) cannot
 * be edited or deleted.
 *
 * Target Time: < 20 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import type { PrismaClient } from '@prisma/client';
import { stopTestApp, type TestApp } from '../../shared';
import type { AuthHelper } from '../../shared/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!@#';

describe('E2E Journey: Resume Style Lifecycle', () => {
  let app: TestApp;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaClient;
  let testUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };
  let adminToken: string;
  let firstSystemStyleId: string;
  let resumeId: string;
  // Track admin-created style ids so we can clean them up regardless of
  // intermediate test failures.
  const customStyleIds: string[] = [];

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;

    adminToken = await authHelper.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  afterAll(async () => {
    try {
      if (customStyleIds.length > 0) {
        await prisma.resumeStyle.deleteMany({ where: { id: { in: customStyleIds } } });
      }
      if (testUser?.email) {
        await cleanupHelper.deleteUserByEmail(testUser.email);
      }
    } catch {
      // Best-effort cleanup.
    }
    await stopTestApp();
  });

  // ── Step 1: Setup ───────────────────────────────────────────────────

  describe('Step 1: Setup', () => {
    it.serial('should create and authenticate a regular user', async () => {
      testUser = authHelper.createTestUser('resume-style');
      const result = await authHelper.registerAndLogin(testUser);
      testUser.token = result.token;
      testUser.userId = result.userId;

      expect(testUser.token).toBeDefined();
      expect(testUser.userId).toBeDefined();
    });

    it.serial('should create a resume to apply styles against', async () => {
      const res = await app.request
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          title: 'Resume Style Lifecycle Resume',
          fullName: 'Style Test User',
          jobTitle: 'Designer',
        });

      // POST /v1/resumes returns 200 (the use case wraps the created
      // entity inside the standard envelope without overriding the
      // status). Accept both 200 and 201 to stay future-proof.
      expect([200, 201]).toContain(res.status);
      resumeId = res.body.id;
      expect(resumeId).toBeDefined();
    });
  });

  // ── Step 2: Browse the catalog ─────────────────────────────────────

  describe('Step 2: Browse the catalog', () => {
    it.serial('should list seeded system styles (paginated envelope)', async () => {
      const res = await app.request
        .get('/api/v1/resume-styles?page=1&limit=20')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      const { items, total, page, limit } = res.body;
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(typeof total).toBe('number');
      expect(page).toBe(1);
      expect(limit).toBe(20);

      // System-seeded styles must show up — that's what the user
      // catalog gates onto for ATS-safe defaults.
      const systemStyle = items.find((s: { isSystem: boolean }) => s.isSystem === true);
      expect(systemStyle).toBeDefined();
      firstSystemStyleId = systemStyle.id;
    });

    it.serial('should respect the limit query parameter', async () => {
      const res = await app.request
        .get('/api/v1/resume-styles?page=1&limit=1')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(1);
      expect(res.body.limit).toBe(1);
    });

    it.serial('should fetch a style detail with full config', async () => {
      const res = await app.request
        .get(`/api/v1/resume-styles/${firstSystemStyleId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      const style = res.body;
      expect(style.id).toBe(firstSystemStyleId);
      expect(style.isSystem).toBe(true);
      expect(typeof style.styleConfig).toBe('object');
      expect(typeof style.sectionStyles).toBe('object');
      // Detail-only fields surface.
      expect(typeof style.version).toBe('number');
      expect(typeof style.styleScoreBreakdown).toBe('object');
      expect(typeof style.styleScoreBreakdown.buckets).toBe('object');
      expect(Array.isArray(style.styleScoreBreakdown.issues)).toBe(true);
      // System styles satisfy every rubric criterion → perfect score.
      expect(style.styleScore).toBe(100);
    });

    it.serial('should reject unauthenticated catalog reads', async () => {
      const res = await app.request.get('/api/v1/resume-styles');
      expect(res.status).toBe(401);
    });
  });

  // ── Step 2.5: Preview a style (binary stream) ──────────────────────
  //
  // Regression guard: `GET /resume-styles/:id/preview.pdf` returned an
  // unhandled 500 because the bootstrap passed the export *HTTP bundle*
  // (`ExportHttpBundle`) where the export *use-case bag* (`ExportUseCases`,
  // with `exportPdfUseCase`) was expected — so the preview adapter
  // dereferenced `undefined.exportPdfUseCase`. The endpoint had no e2e
  // coverage despite being documented at the top of this journey.

  describe('Step 2.5: Preview a style', () => {
    // Regression guard #2 (the user-reported bug): a user *mid-onboarding*
    // has NO `primaryResumeId` yet — onboarding only sets it when it
    // materializes the resume, which happens at/after the resume-style step.
    // The preview is documented as a *generic* style preview, so it must
    // still render (a built-in sample resume styled with the candidate
    // style). Before the sample fallback, the Typst generator threw
    // `EntityNotFoundException('Resume')` → 404 → the web modal showed
    // "Pré-visualização indisponível." This test runs FIRST, while
    // `primaryResumeId` is still null, and must never see a 404.
    it.serial(
      'should stream a generic sample preview when the user has no primary resume (onboarding)',
      async () => {
        // Mirror the onboarding precondition explicitly: no primary resume.
        await prisma.user.update({
          where: { id: testUser.userId },
          data: { primaryResumeId: null },
        });

        const res = await app.request
          .get(`/api/v1/resume-styles/${firstSystemStyleId}/preview.pdf`)
          .set('Authorization', `Bearer ${testUser.token}`);

        // The bug: a missing primary resume 404'd. The generic preview must
        // render a sample (200) — or surface a *handled* Typst outage
        // (502/503). A 404 here means the sample fallback is missing.
        expect(res.status).not.toBe(404);
        expect([200, 502, 503]).toContain(res.status);

        if (res.status === 200) {
          expect(Buffer.isBuffer(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(1000);
          expect(res.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
        } else {
          console.warn(`⚠️  Sample-preview render unavailable (status ${res.status})`);
        }
      },
      60000,
    );

    it.serial(
      'should stream a preview PDF for a system style (never an unhandled 500)',
      async () => {
        // The preview renders the requesting user's primary resume with the
        // candidate style applied as a draft theme. Onboarding sets
        // `primaryResumeId`; plain `POST /v1/resumes` does not, so mirror
        // that precondition here.
        await prisma.user.update({
          where: { id: testUser.userId },
          data: { primaryResumeId: resumeId },
        });

        const res = await app.request
          .get(`/api/v1/resume-styles/${firstSystemStyleId}/preview.pdf`)
          .set('Authorization', `Bearer ${testUser.token}`);

        // A correctly-wired pipeline streams the PDF (200). A genuinely
        // unavailable Typst toolchain in CI surfaces as a *handled* 502/503.
        // The wiring bug produced an *unhandled* 500, and a missing
        // user/resume would 4xx — tolerate only the handled outcomes so the
        // composition fix and the userId threading both stay covered.
        expect([200, 502, 503]).toContain(res.status);

        if (res.status === 200) {
          // Assert it's a real PDF by magic bytes — the binary mounter emits
          // application/octet-stream regardless of the declared media type, so
          // a content-type check would be misleading here.
          expect(Buffer.isBuffer(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(1000);
          expect(res.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
        } else {
          console.warn(`⚠️  Style preview render unavailable (status ${res.status})`);
        }
      },
      60000,
    );

    it.serial('should reject unauthenticated preview reads', async () => {
      const res = await app.request.get(`/api/v1/resume-styles/${firstSystemStyleId}/preview.pdf`);
      expect(res.status).toBe(401);
    });
  });

  // ── Step 3: Apply a style to a resume ──────────────────────────────

  describe('Step 3: Apply a style to a resume', () => {
    it.serial('should apply a system style to the user-owned resume', async () => {
      const res = await app.request
        .post(`/api/v1/resumes/${resumeId}/style`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ styleId: firstSystemStyleId });

      expect(res.status).toBe(201);
      // The resume row must now point at the chosen style.
      const updated = await prisma.resume.findUnique({
        where: { id: resumeId },
        select: { styleId: true },
      });
      expect(updated?.styleId).toBe(firstSystemStyleId);
    });

    it.serial('should reject applying a style to someone else’s resume', async () => {
      const stranger = authHelper.createTestUser('resume-style-stranger');
      const strangerResult = await authHelper.registerAndLogin(stranger);

      try {
        const res = await app.request
          .post(`/api/v1/resumes/${resumeId}/style`)
          .set('Authorization', `Bearer ${strangerResult.token}`)
          .send({ styleId: firstSystemStyleId });

        // Either 403 (ownership) or 404 (resume hidden from stranger).
        expect([403, 404]).toContain(res.status);
      } finally {
        await cleanupHelper.deleteUserByEmail(stranger.email);
      }
    });
  });

  // ── Step 4: Admin CRUD on non-system styles ────────────────────────

  describe('Step 4: Admin CRUD', () => {
    let createdStyleId: string;

    it.serial('should reject regular users on POST /v1/admin/resume-styles', async () => {
      const res = await app.request
        .post('/api/v1/admin/resume-styles')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'unauthorized-style',
          description: null,
          typstTemplate: '#set page(margin: 0pt)\n',
          layoutKind: 'SINGLE_COLUMN',
          styleConfig: {},
          sectionStyles: {},
        });
      expect(res.status).toBe(403);
    });

    it.serial('should let admin create a non-system style', async () => {
      const suffix = Date.now();
      const res = await app.request
        .post('/api/v1/admin/resume-styles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `e2e-style-${suffix}`,
          description: 'Created by resume-style lifecycle journey',
          typstTemplate: '#set page(margin: 1cm)\n',
          layoutKind: 'SINGLE_COLUMN',
          // styleScore is recomputed from styleConfig by the ATS rubric; a
          // create below STYLE_SCORE_MIN (80) is rejected with 422. Use a
          // full DSL-compliant config (mirrors the seeded ATS Classic style,
          // which scores 100) so the create is accepted.
          styleConfig: {
            version: '1.0.0',
            layout: {
              type: 'single-column',
              paperSize: 'a4',
              margins: 'normal',
              pageBreakBehavior: 'auto',
            },
            tokens: {
              typography: {
                fontFamily: { heading: 'calibri', body: 'calibri' },
                fontSize: 'base',
                headingStyle: 'bold',
              },
              colors: {
                colors: {
                  primary: '#111111',
                  secondary: '#444444',
                  background: '#FFFFFF',
                  surface: '#F9FAFB',
                  text: { primary: '#1A1A1A', secondary: '#444444', accent: '#222222' },
                  border: '#CCCCCC',
                  divider: '#E5E7EB',
                },
                borderRadius: 'sm',
                shadows: 'none',
              },
              spacing: {
                density: 'comfortable',
                sectionGap: 'md',
                itemGap: 'md',
                contentPadding: 'md',
              },
            },
            sections: [],
          },
          sectionStyles: {},
        });

      expect([200, 201]).toContain(res.status);
      const style = res.body;
      expect(style.id).toBeDefined();
      expect(style.isSystem).toBe(false);
      expect(style.authorId).toBeDefined();
      createdStyleId = style.id;
      customStyleIds.push(createdStyleId);
    });

    it.serial('should let admin update the non-system style', async () => {
      const res = await app.request
        .patch(`/api/v1/admin/resume-styles/${createdStyleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'Updated by lifecycle journey' });

      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated by lifecycle journey');
    });

    it.serial('should refuse to update a system style', async () => {
      const res = await app.request
        .patch(`/api/v1/admin/resume-styles/${firstSystemStyleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ description: 'should not stick' });

      // Use case throws StyleNotEditable / similar conflict; the
      // mounted route surfaces that as 4xx.
      expect([400, 403, 409, 422]).toContain(res.status);
    });

    it.serial('should let admin delete the non-system style', async () => {
      const res = await app.request
        .delete(`/api/v1/admin/resume-styles/${createdStyleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 204]).toContain(res.status);
      // Style is gone (or at least no longer reachable via detail).
      const followup = await app.request
        .get(`/api/v1/resume-styles/${createdStyleId}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect([404, 410]).toContain(followup.status);
      customStyleIds.splice(customStyleIds.indexOf(createdStyleId), 1);
    });

    it.serial('should refuse to delete a system style', async () => {
      const res = await app.request
        .delete(`/api/v1/admin/resume-styles/${firstSystemStyleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 403, 409, 422]).toContain(res.status);
    });
  });
});
