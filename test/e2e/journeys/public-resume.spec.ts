/**
 * E2E Journey 4: Public Resume (Shares)
 *
 * Tests the complete share lifecycle: creation, public access, password protection,
 * expiration handling, and deletion. Validates analytics tracking and error cases.
 *
 * Flow:
 * 1. Setup - Register user, complete onboarding (creates resume)
 * 2. Create Share - POST share with custom slug
 * 3. List Shares - GET shares for resume
 * 4. Public Access - GET public resume (no auth)
 * 5. Public Download - GET download endpoint
 * 6. Password Protection - Create password-protected share, test access
 * 7. Expiration - Create expired share, verify 404
 * 8. Inactive Share - Test isActive flag
 * 9. Delete Share - DELETE share
 * 10. Verify Deleted - Confirm inaccessible
 * 11. Error Cases - 403, 404 scenarios
 * 12. Cleanup
 *
 * Target Time: < 20 seconds
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { createFullOnboardingData } from '../fixtures/resumes.fixture';
import {
  createExpiringShare,
  createPasswordProtectedShare,
  createShareData,
  createShareWithCustomSlug,
} from '../fixtures/shares.fixture';
import type { AuthHelper } from '../helpers/auth.helper';
import type { CleanupHelper } from '../helpers/cleanup.helper';
import { createE2ETestApp } from '../setup-e2e';

describe('E2E Journey 4: Public Resume (Shares)', () => {
  let app: INestApplication;
  let authHelper: AuthHelper;
  let cleanupHelper: CleanupHelper;
  let prisma: PrismaService;
  let testUser: {
    email: string;
    password: string;
    name: string;
    token?: string;
    userId?: string;
  };
  let resumeId: string;
  let shareSlug: string;
  let shareId: string;
  let passwordProtectedSlug: string;
  let passwordProtectedId: string;
  let expiredShareSlug: string;

  beforeAll(async () => {
    const testApp = await createE2ETestApp();
    app = testApp.app;
    authHelper = testApp.authHelper;
    cleanupHelper = testApp.cleanupHelper;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    if (testUser?.email) {
      await cleanupHelper.deleteUserByEmail(testUser.email);
    }
    await app.close();
  });

  describe('Step 1: Setup', () => {
    it('should create user and resume via onboarding', async () => {
      testUser = authHelper.createTestUser('public-resume');
      const result = await authHelper.registerAndLogin(testUser);
      testUser.token = result.token;
      testUser.userId = result.userId;

      const onboardingData = createFullOnboardingData('public-resume');
      const onboardingResponse = await request(app.getHttpServer())
        .post('/api/v1/onboarding')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(onboardingData);

      expect(onboardingResponse.status).toBe(200);
      expect(onboardingResponse.body.data.resumeId).toBeDefined();

      resumeId = onboardingResponse.body.data.resumeId;
    });
  });

  describe('Step 2: Create Share', () => {
    it('should create a public share with custom slug', async () => {
      const shareData = createShareWithCustomSlug(resumeId, `my-awesome-resume-${Date.now()}`);

      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(shareData);

      expect(response.status).toBe(201);

      // Response wrapped in data.share
      expect(response.body.data.share.slug).toBe(shareData.slug);
      expect(response.body.data.share.resumeId).toBe(resumeId);
      expect(response.body.data.share.isActive).toBe(true);
      expect(response.body.data.share.hasPassword).toBe(false);
      expect(response.body.data.share.publicUrl).toBeDefined();
      expect(response.body.data.share.publicUrl).toContain(shareData.slug);

      shareSlug = response.body.data.share.slug;
      shareId = response.body.data.share.id;
    });

    it('should reject share creation without authentication', async () => {
      const shareData = createShareData(resumeId, 'unauthorized');

      const response = await request(app.getHttpServer()).post('/api/v1/shares').send(shareData);

      expect(response.status).toBe(401);
    });

    it('should reject duplicate slug', async () => {
      // Try to create share with same slug
      const shareData = createShareWithCustomSlug(resumeId, shareSlug);

      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(shareData);

      expect([400, 409]).toContain(response.status);
    });
  });

  describe('Step 3: List Shares', () => {
    it('should list all shares for resume', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/shares/resume/${resumeId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.shares).toBeDefined();
      expect(Array.isArray(response.body.data.shares)).toBe(true);
      expect(response.body.data.shares.length).toBeGreaterThan(0);

      const share = response.body.data.shares.find((s: { slug: string }) => s.slug === shareSlug);
      expect(share).toBeDefined();
      expect(share.isActive).toBe(true);
    });
  });

  describe('Step 4: Public Access', () => {
    it('should access public resume without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resume).toBeDefined();
      expect(response.body.data.share).toBeDefined();
      expect(response.body.data.share.slug).toBe(shareSlug);
    });

    it('should return 404 for non-existent share slug', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/non-existent-slug-${Date.now()}`,
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Step 5: Public Download', () => {
    it('should access download endpoint without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}/download`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resume).toBeDefined();
    });
  });

  describe('Step 6: Password Protection', () => {
    const password = 'SecurePassword123!';

    it('should create password-protected share', async () => {
      const shareData = createPasswordProtectedShare(resumeId, password);

      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(shareData);

      expect(response.status).toBe(201);
      expect(response.body.data.share.hasPassword).toBe(true);
      expect(response.body.data.share.password).toBeUndefined(); // Password not returned

      passwordProtectedSlug = response.body.data.share.slug;
      passwordProtectedId = response.body.data.share.id;
    });

    it('should deny access without password', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${passwordProtectedSlug}`,
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny access with incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/public/resumes/${passwordProtectedSlug}`)
        .set('x-share-password', 'WrongPassword123!');

      expect(response.status).toBe(403);
    });

    it('should allow access with correct password', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/public/resumes/${passwordProtectedSlug}`)
        .set('x-share-password', password);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.resume).toBeDefined();
    });
  });

  describe('Step 7: Expiration', () => {
    it('should create expired share', async () => {
      // Expired 10 minutes ago
      const shareData = createExpiringShare(resumeId, -10);

      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(shareData);

      expect(response.status).toBe(201);
      expect(response.body.data.share.expiresAt).toBeDefined();

      expiredShareSlug = response.body.data.share.slug;
    });

    it('should return 404 for expired share', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${expiredShareSlug}`,
      );

      expect(response.status).toBe(404);
    });

    it('should create share expiring in future', async () => {
      // Expires in 7 days
      const shareData = createExpiringShare(resumeId, 7 * 24 * 60);

      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send(shareData);

      expect(response.status).toBe(201);

      const futureSlug = response.body.data.share.slug;

      // Should be accessible
      const accessResponse = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${futureSlug}`,
      );

      expect(accessResponse.status).toBe(200);
    });
  });

  describe('Step 8: Inactive Share', () => {
    it('should deny access to inactive share', async () => {
      // Set share as inactive via database
      await prisma.resumeShare.update({
        where: { id: shareId },
        data: { isActive: false },
      });

      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      expect([403, 404]).toContain(response.status);

      // Reactivate for subsequent tests
      await prisma.resumeShare.update({
        where: { id: shareId },
        data: { isActive: true },
      });
    });
  });

  describe('Step 9: Delete Share', () => {
    it('should delete share successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/shares/${shareId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication to delete share', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/v1/shares/${passwordProtectedId}`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Step 10: Verify Deleted', () => {
    it('should return 404 when accessing deleted share', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      expect(response.status).toBe(404);
    });
  });

  describe('Step 11: Error Cases', () => {
    it('should prevent cross-user share deletion', async () => {
      // Create second user
      const otherUser = authHelper.createTestUser('other-user');
      const otherResult = await authHelper.registerAndLogin(otherUser);

      // Try to delete first user's share
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/shares/${passwordProtectedId}`)
        .set('Authorization', `Bearer ${otherResult.token}`);

      expect(response.status).toBe(403);

      // Cleanup second user
      await cleanupHelper.deleteUserByEmail(otherUser.email);
    });

    it('should return 404 for invalid share ID in delete', async () => {
      const fakeShareId = 'clhxxxxxxxxxxxxxxxxxx';

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/shares/${fakeShareId}`)
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(response.status).toBe(404);
    });

    it('should validate slug format in creation', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/shares')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          resumeId,
          slug: 'Invalid Slug With Spaces!',
        });

      expect(response.status).toBe(400);
    });
  });
});
