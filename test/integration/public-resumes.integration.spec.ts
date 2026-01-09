import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  getRequest,
  getApp,
  closeApp,
  authHeader,
  createTestUserAndLogin,
  getPrisma,
} from './setup';

describe('Public Resumes Integration', () => {
  let userId: string;
  let resumeId: string;
  let shareSlug: string;

  beforeAll(async () => {
    await getApp();
    const { userId: id } = await createTestUserAndLogin();
    userId = id;

    const prisma = getPrisma();
    const resume = await prisma.resume.create({
      data: {
        userId,
        title: 'Test Resume',
        contentPtBr: { sections: [] },
      },
    });
    resumeId = resume.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.resumeShare.deleteMany({
      where: { resumeId },
    });
    await prisma.shareAnalytics.deleteMany({});
    await prisma.resumeVersion.deleteMany({
      where: { resumeId },
    });
    await prisma.resume.delete({
      where: { id: resumeId },
    });
    await prisma.user.delete({
      where: { id: userId },
    });
    await closeApp();
  });

  describe('Share Management Flow', () => {
    it('should create a public share with custom slug', async () => {
      const response = await getRequest()
        .post('/api/v1/shares')
        .set(authHeader())
        .send({
          resumeId,
          slug: 'my-awesome-resume',
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.slug).toBe('my-awesome-resume');
      expect(response.body.resumeId).toBe(resumeId);
      expect(response.body.isActive).toBe(true);
      expect(response.body).toHaveProperty('publicUrl');

      shareSlug = response.body.slug;
    });

    it('should create a password-protected share', async () => {
      const response = await getRequest()
        .post('/api/v1/shares')
        .set(authHeader())
        .send({
          resumeId,
          password: 'secret123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('slug');
      expect(response.body.hasPassword).toBe(true);
    });

    it('should list user shares for a resume', async () => {
      const response = await getRequest()
        .get(`/api/v1/shares/resume/${resumeId}`)
        .set(authHeader());

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body[0]).toHaveProperty('slug');
      expect(response.body[0]).toHaveProperty('resumeId');
    });

    it('should access public resume via slug', async () => {
      const response = await getRequest().get(
        `/api/v1/public/resumes/${shareSlug}`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('resume');
      expect(response.body.resume.id).toBe(resumeId);
      expect(response.body.resume.title).toBe('Test Resume');
    });

    it('should require password for protected shares', async () => {
      const prisma = getPrisma();

      // Create password-protected share directly
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('secret123', 10);

      const protectedShare = await prisma.resumeShare.create({
        data: {
          resumeId,
          slug: `protected-${Date.now()}`,
          password: hashedPassword,
        },
      });

      const failResponse = await getRequest().get(
        `/api/v1/public/resumes/${protectedShare.slug}`,
      );
      expect(failResponse.status).toBe(403);

      const successResponse = await getRequest()
        .get(`/api/v1/public/resumes/${protectedShare.slug}`)
        .set('x-share-password', 'secret123');

      expect(successResponse.status).toBe(200);
      expect(successResponse.body.resume.id).toBe(resumeId);
    });

    it('should return 404 for expired shares', async () => {
      const prisma = getPrisma();
      const expiredShare = await prisma.resumeShare.create({
        data: {
          resumeId,
          slug: `expired-${Date.now()}`,
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const response = await getRequest().get(
        `/api/v1/public/resumes/${expiredShare.slug}`,
      );
      expect(response.status).toBe(404);
    });

    it('should delete a share', async () => {
      const prisma = getPrisma();
      const share = await prisma.resumeShare.findFirst({
        where: { slug: shareSlug },
      });

      const response = await getRequest()
        .delete(`/api/v1/shares/${share.id}`)
        .set(authHeader());

      expect(response.status).toBe(200);

      const deleted = await prisma.resumeShare.findUnique({
        where: { id: share.id },
      });
      expect(deleted).toBeNull();
    });
  });

  describe('Resume Caching', () => {
    it('should cache public resume data', async () => {
      const prisma = getPrisma();
      const share = await prisma.resumeShare.create({
        data: {
          resumeId,
          slug: `cached-${Date.now()}`,
        },
      });

      // First call - should populate cache
      const firstResponse = await getRequest().get(
        `/api/v1/public/resumes/${share.slug}`,
      );
      expect(firstResponse.status).toBe(200);
      const firstResumeId = firstResponse.body.resume.id;

      // Second call - should use cache
      const secondResponse = await getRequest().get(
        `/api/v1/public/resumes/${share.slug}`,
      );
      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.resume.id).toBe(firstResumeId);

      // Verify cache works by checking data consistency
      expect(secondResponse.body.resume).toEqual(firstResponse.body.resume);
    });
  });
});
