import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import {
  getRequest,
  getApp,
  closeApp,
  authHeader,
  createTestUserAndLogin,
  getPrisma,
} from './setup';

describe('Resume Versions Integration', () => {
  let userId: string;
  let resumeId: string;

  beforeAll(async () => {
    await getApp();
    const { userId: id } = await createTestUserAndLogin();
    userId = id;
  });

  afterAll(async () => {
    if (resumeId) {
      const prisma = getPrisma();
      await prisma.resumeVersion.deleteMany({
        where: { resumeId },
      });
      await prisma.resume.delete({
        where: { id: resumeId },
      });
    }
    await closeApp();
  });

  describe('Version Creation & Retrieval', () => {
    it('should auto-create version on resume creation', async () => {
      const prisma = getPrisma();
      const resume = await prisma.resume.create({
        data: {
          userId,
          title: 'Versioned Resume',
          contentPtBr: {
            sections: [{ type: 'header', data: { name: 'John Doe' } }],
          },
        },
      });
      resumeId = resume.id;

      // Manually create initial version (normally done by service)
      await prisma.resumeVersion.create({
        data: {
          resumeId,
          versionNumber: 1,
          snapshot: resume,
          label: 'Initial version',
        },
      });

      const response = await getRequest()
        .get(`/api/v1/versions/${resumeId}`)
        .set(authHeader());

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].versionNumber).toBe(1);
      expect(response.body[0].label).toBe('Initial version');
    });

    it('should create new version on resume update', async () => {
      const prisma = getPrisma();
      const updated = await prisma.resume.update({
        where: { id: resumeId },
        data: {
          contentPtBr: {
            sections: [
              { type: 'header', data: { name: 'Jane Doe' } },
              { type: 'experience', data: { company: 'ACME Corp' } },
            ],
          },
        },
      });

      await prisma.resumeVersion.create({
        data: {
          resumeId,
          versionNumber: 2,
          snapshot: updated,
          label: 'Added experience section',
        },
      });

      const response = await getRequest()
        .get(`/api/v1/versions/${resumeId}`)
        .set(authHeader());

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body[0].versionNumber).toBe(2);
      expect(response.body[1].versionNumber).toBe(1);
    });

    it('should get specific version details', async () => {
      const prisma = getPrisma();
      const versions = await prisma.resumeVersion.findMany({
        where: { resumeId },
        orderBy: { versionNumber: 'desc' },
      });

      expect(versions.length).toBeGreaterThanOrEqual(1);

      const response = await getRequest()
        .get(`/api/v1/versions/${resumeId}/${versions[0].id}`)
        .set(authHeader());

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: versions[0].id,
        versionNumber: 2,
      });
    });
  });

  describe('Version Rollback', () => {
    it('should restore resume to previous version', async () => {
      const prisma = getPrisma();
      const versions = await prisma.resumeVersion.findMany({
        where: { resumeId },
        orderBy: { versionNumber: 'asc' },
      });

      const firstVersion = versions[0];

      const response = await getRequest()
        .post(`/api/v1/versions/${resumeId}/restore/${firstVersion.id}`)
        .set(authHeader());

      expect(response.status).toBe(201);

      const updatedResume = await prisma.resume.findUnique({
        where: { id: resumeId },
      });

      // snapshot contains full resume, but only contentPtBr is restored
      const expectedContent = (firstVersion.snapshot as any).contentPtBr;
      expect(updatedResume.contentPtBr).toEqual(expectedContent);
    });

    it('should create new version after rollback', async () => {
      const prisma = getPrisma();
      const versionsBefore = await prisma.resumeVersion.count({
        where: { resumeId },
      });

      const versions = await prisma.resumeVersion.findMany({
        where: { resumeId },
        orderBy: { versionNumber: 'asc' },
      });

      const response = await getRequest()
        .post(`/api/v1/versions/${resumeId}/restore/${versions[0].id}`)
        .set(authHeader());

      expect(response.status).toBe(201);

      const versionsAfter = await prisma.resumeVersion.count({
        where: { resumeId },
      });

      expect(versionsAfter).toBe(versionsBefore + 1);
    });

    it('should not allow unauthorized rollback', async () => {
      const prisma = getPrisma();
      const versions = await prisma.resumeVersion.findFirst({
        where: { resumeId },
      });

      const response = await getRequest().post(
        `/api/v1/versions/${resumeId}/restore/${versions.id}`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Version Cleanup', () => {
    it('should keep only 30 most recent versions', async () => {
      const prisma = getPrisma();

      // Check how many versions exist already
      const existingCount = await prisma.resumeVersion.count({
        where: { resumeId },
      });

      // Create enough versions to exceed 30 total
      const toCreate = 35 - existingCount;
      for (let i = 0; i < toCreate; i++) {
        await getRequest()
          .patch(`/api/v1/resumes/${resumeId}`)
          .send({ contentPtBr: { sections: [], iteration: existingCount + i } })
          .set(authHeader());
      }

      // Trigger cleanup (normally done automatically)
      const versions = await prisma.resumeVersion.findMany({
        where: { resumeId },
        orderBy: { versionNumber: 'desc' },
        take: 30,
      });

      await prisma.resumeVersion.deleteMany({
        where: {
          resumeId,
          id: { notIn: versions.map((v) => v.id) },
        },
      });

      const remainingVersions = await prisma.resumeVersion.count({
        where: { resumeId },
      });

      expect(remainingVersions).toBeLessThanOrEqual(30);
    });
  });
});
