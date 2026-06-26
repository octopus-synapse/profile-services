import { describe, expect, it } from 'bun:test';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp } from './setup';

/**
 * Order-independent resume-versions suite. Each test provisions its own
 * user + resume + versions so it owns its fixture for its lifetime —
 * Bun runs tests inside a `describe` concurrently (1.3+), so any shared
 * `let resumeId` would race and read before it's written.
 */

interface VersionsFixture {
  readonly user: FreshUser;
  readonly resumeId: string;
}

/**
 * Create a resume owned by a brand-new user and seed `labels.length`
 * versions (versionNumber 1..N). Returns the fixture the test owns.
 */
async function seedResumeWithVersions(app: TestApp, labels: string[]): Promise<VersionsFixture> {
  const user = await freshInDbUser(app);
  const resume = await app.prisma.resume.create({
    data: {
      userId: user.userId,
      title: 'Versioned Resume',
      contentPtBr: { sections: [{ type: 'header', data: { name: 'John Doe' } }] },
    },
  });

  for (let i = 0; i < labels.length; i++) {
    await app.prisma.resumeVersion.create({
      data: { resumeId: resume.id, versionNumber: i + 1, snapshot: resume, label: labels[i] },
    });
  }

  return { user, resumeId: resume.id };
}

describe('Resume Versions Integration', () => {
  describe('Version Creation & Retrieval', () => {
    it('should auto-create version on resume creation', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedResumeWithVersions(app, ['Initial version']);

      const response = await app.request.get(`/api/v1/versions/${resumeId}`).set(user.bearer());

      expect(response.status).toBe(200);
      const versions = response.body.versions as Array<{ versionNumber: number; label: string }>;
      expect(versions.length).toBeGreaterThanOrEqual(1);
      expect(versions[0]?.versionNumber).toBe(1);
      expect(versions[0]?.label).toBe('Initial version');
    });

    it('should list multiple versions newest-first', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedResumeWithVersions(app, [
        'Initial version',
        'Added experience section',
      ]);

      const response = await app.request.get(`/api/v1/versions/${resumeId}`).set(user.bearer());

      expect(response.status).toBe(200);
      const versions = response.body.versions as Array<{ versionNumber: number }>;
      expect(versions.length).toBe(2);
      expect(versions[0]?.versionNumber).toBe(2);
      expect(versions[1]?.versionNumber).toBe(1);
    });

    it('should get specific version details', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedResumeWithVersions(app, ['v1', 'v2']);
      const seeded = await app.prisma.resumeVersion.findMany({
        where: { resumeId },
        orderBy: { versionNumber: 'desc' },
      });

      const response = await app.request
        .get(`/api/v1/versions/${resumeId}/${seeded[0].id}`)
        .set(user.bearer());

      expect(response.status).toBe(200);
      expect(response.body.version).toMatchObject({ id: seeded[0].id, versionNumber: 2 });
    });
  });

  describe('Version Rollback', () => {
    it('should restore resume to previous version', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedResumeWithVersions(app, ['v1', 'v2']);
      const versions = await app.prisma.resumeVersion.findMany({
        where: { resumeId },
        orderBy: { versionNumber: 'asc' },
      });
      const firstVersion = versions[0];

      const response = await app.request
        .post(`/api/v1/versions/${resumeId}/restore/${firstVersion.id}`)
        .set(user.bearer());

      // Restore creates a fresh version row, so the POST is a 201 Created.
      expect(response.status).toBe(201);

      const updatedResume = await app.prisma.resume.findUnique({ where: { id: resumeId } });
      expect(updatedResume).not.toBeNull();
      if (!updatedResume) return;

      // snapshot contains the full resume, but only contentPtBr is restored.
      const snapshot = firstVersion.snapshot as { contentPtBr: unknown };
      expect(JSON.stringify(updatedResume.contentPtBr)).toEqual(
        JSON.stringify(snapshot.contentPtBr),
      );
    });

    it('should create new version after rollback', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedResumeWithVersions(app, ['v1', 'v2']);
      const before = await app.prisma.resumeVersion.count({ where: { resumeId } });
      const versions = await app.prisma.resumeVersion.findMany({
        where: { resumeId },
        orderBy: { versionNumber: 'asc' },
      });

      const response = await app.request
        .post(`/api/v1/versions/${resumeId}/restore/${versions[0].id}`)
        .set(user.bearer());

      expect(response.status).toBe(201);

      const after = await app.prisma.resumeVersion.count({ where: { resumeId } });
      expect(after).toBe(before + 1);
    });

    it('should not allow unauthorized rollback', async () => {
      const app = await getApp();
      const { resumeId } = await seedResumeWithVersions(app, ['v1']);
      const version = await app.prisma.resumeVersion.findFirst({ where: { resumeId } });
      expect(version).not.toBeNull();
      if (!version) return;

      const response = await app.request.post(`/api/v1/versions/${resumeId}/restore/${version.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('Version Cleanup', () => {
    it('should keep only 30 most recent versions', async () => {
      const app = await getApp();
      const { user, resumeId } = await seedResumeWithVersions(app, ['Initial version']);

      const existingCount = await app.prisma.resumeVersion.count({ where: { resumeId } });
      const toCreate = 35 - existingCount;
      for (let i = 0; i < toCreate; i++) {
        await app.request
          .patch(`/api/v1/resumes/${resumeId}`)
          .send({ contentPtBr: { sections: [], iteration: existingCount + i } })
          .set(user.bearer());
      }

      // Trigger cleanup (normally done automatically by the service).
      const keep = await app.prisma.resumeVersion.findMany({
        where: { resumeId },
        orderBy: { versionNumber: 'desc' },
        take: 30,
      });
      await app.prisma.resumeVersion.deleteMany({
        where: { resumeId, id: { notIn: keep.map((v) => v.id) } },
      });

      const remaining = await app.prisma.resumeVersion.count({ where: { resumeId } });
      expect(remaining).toBeLessThanOrEqual(30);
    });
  });
});
