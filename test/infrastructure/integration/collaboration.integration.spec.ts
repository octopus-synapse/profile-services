/**
 * Collaboration Integration Tests
 *
 * Tests resume collaboration features:
 * - Add collaborator to resume
 * - List collaborators
 * - Update collaborator role
 * - Remove collaborator
 * - Authorization boundaries (owner vs collaborator vs non-collaborator)
 * - Idempotency and edge cases
 *
 * Roles: VIEWER, EDITOR, ADMIN
 *
 * Order-independent: every test provisions its own owner + resume +
 * the collaborator/outsider actors it needs via `freshInDbUser`. Bun
 * 1.3+ runs tests inside a `describe` concurrently, so any shared
 * `let resumeId/ownerToken` would race; each test now owns its fixture
 * for its lifetime.
 */

import { describe, expect, it } from 'bun:test';
import type { FreshUser } from '../shared/fresh-context';
import { freshInDbUser } from '../shared/fresh-context';
import type { TestApp } from '../shared/test-app';
import { getApp } from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

interface CollabFixture {
  readonly owner: FreshUser;
  readonly resumeId: string;
}

/** Create a fresh owner + a resume they own. */
async function freshOwnerWithResume(app: TestApp): Promise<CollabFixture> {
  const owner = await freshInDbUser(app);
  const resume = await app.prisma.resume.create({
    data: { userId: owner.userId, title: 'Collab Test Resume' },
  });
  return { owner, resumeId: resume.id };
}

/** Invite `invitee` onto `resumeId` as `role`, owner-authenticated. Returns the 201 response. */
function invite(
  app: TestApp,
  owner: FreshUser,
  resumeId: string,
  inviteeUserId: string,
  role: string,
) {
  return app.request
    .post(`/api/v1/resumes/${resumeId}/collaborators`)
    .set(owner.bearer())
    .send({ userId: inviteeUserId, role });
}

describeIntegration('Collaboration Integration Tests', () => {
  describe('Add collaborator to resume', () => {
    it('should invite a collaborator as VIEWER', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);

      const response = await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      expect(response.status).toBe(201);
      expect(response.body.collaborator).toBeDefined();
      expect(response.body.collaborator.userId).toBe(collaborator.userId);
      expect(response.body.collaborator.role).toBe('VIEWER');
    });

    it('should invite a second collaborator as EDITOR', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator2 = await freshInDbUser(app);

      const response = await invite(app, owner, resumeId, collaborator2.userId, 'EDITOR');

      expect(response.status).toBe(201);
      expect(response.body.collaborator.role).toBe('EDITOR');
    });

    it('should reject invitation without authentication', async () => {
      const app = await getApp();
      const { resumeId } = await freshOwnerWithResume(app);
      const outsider = await freshInDbUser(app);

      const response = await app.request
        .post(`/api/v1/resumes/${resumeId}/collaborators`)
        .send({ userId: outsider.userId, role: 'VIEWER' });

      expect(response.status).toBe(401);
    });

    it('should reject invitation with invalid role', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const outsider = await freshInDbUser(app);

      const response = await invite(app, owner, resumeId, outsider.userId, 'INVALID_ROLE');

      expect(response.status).toBe(400);
    });

    it('should reject invitation with empty userId', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);

      const response = await invite(app, owner, resumeId, '', 'VIEWER');

      expect(response.status).toBe(400);
    });

    it('should handle adding the same collaborator twice', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);

      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');
      const response = await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      // Should be idempotent (200/201) or return conflict (409)
      expect([200, 201, 409]).toContain(response.status);
    });
  });

  describe('List collaborators', () => {
    it('should list all collaborators for resume owner', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      const collaborator2 = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');
      await invite(app, owner, resumeId, collaborator2.userId, 'EDITOR');

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/collaborators`)
        .set(owner.bearer());

      expect(response.status).toBe(200);
      expect(response.body.collaborators).toBeDefined();
      expect(Array.isArray(response.body.collaborators)).toBe(true);
      expect(response.body.collaborators.length).toBeGreaterThanOrEqual(2);

      // Should contain both collaborators
      const userIds = response.body.collaborators.map((c: { userId: string }) => c.userId);
      expect(userIds).toContain(collaborator.userId);
      expect(userIds).toContain(collaborator2.userId);
    });

    it('should allow collaborator to list collaborators', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/collaborators`)
        .set(collaborator.bearer());

      // Collaborators should be able to see who else collaborates
      expect([200, 403]).toContain(response.status);
    });

    it('should reject listing without authentication', async () => {
      const app = await getApp();
      const { resumeId } = await freshOwnerWithResume(app);

      const response = await app.request.get(`/api/v1/resumes/${resumeId}/collaborators`);

      expect(response.status).toBe(401);
    });

    it('should reject listing by non-collaborator', async () => {
      const app = await getApp();
      const { resumeId } = await freshOwnerWithResume(app);
      const outsider = await freshInDbUser(app);

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/collaborators`)
        .set(outsider.bearer());

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Update collaborator role', () => {
    it('should update collaborator role from VIEWER to EDITOR', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .set(owner.bearer())
        .send({ role: 'EDITOR' });

      expect(response.status).toBe(200);
      expect(response.body.collaborator.role).toBe('EDITOR');
    });

    it('should update collaborator role to ADMIN', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator2 = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator2.userId, 'EDITOR');

      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator2.userId}`)
        .set(owner.bearer())
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(200);
      expect(response.body.collaborator.role).toBe('ADMIN');
    });

    it('should reject role update with invalid role', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .set(owner.bearer())
        .send({ role: 'SUPERADMIN' });

      expect(response.status).toBe(400);
    });

    it('should reject role update by non-owner', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      const collaborator2 = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');
      await invite(app, owner, resumeId, collaborator2.userId, 'EDITOR');

      // VIEWER/EDITOR should not be able to change roles
      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator2.userId}`)
        .set(collaborator.bearer())
        .send({ role: 'VIEWER' });

      expect([403, 401]).toContain(response.status);
    });

    it('should reject role update by outsider', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      const outsider = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .set(outsider.bearer())
        .send({ role: 'ADMIN' });

      expect([403, 404]).toContain(response.status);
    });

    it('should reject role update without authentication', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .send({ role: 'EDITOR' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for updating non-existent collaborator', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const fakeUserId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${fakeUserId}`)
        .set(owner.bearer())
        .send({ role: 'VIEWER' });

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Collaborator access to shared resume', () => {
    it('should allow collaborator to see shared resumes', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .get('/api/v1/resumes/shared-with-me')
        .set(collaborator.bearer());

      expect(response.status).toBe(200);
      expect(response.body.sharedResumes).toBeDefined();
      expect(Array.isArray(response.body.sharedResumes)).toBe(true);

      // Should include the resume we shared
      const sharedResumeIds = response.body.sharedResumes.map(
        (sr: { resume: { id: string } }) => sr.resume?.id,
      );
      expect(sharedResumeIds).toContain(resumeId);
    });

    it('should not show shared resumes to outsider', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      const outsider = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .get('/api/v1/resumes/shared-with-me')
        .set(outsider.bearer());

      expect(response.status).toBe(200);

      // Outsider should have empty or no matching shared resumes
      const sharedResumeIds = (response.body.sharedResumes || []).map(
        (sr: { resume: { id: string } }) => sr.resume?.id,
      );
      expect(sharedResumeIds).not.toContain(resumeId);
    });

    it('should reject shared-with-me without authentication', async () => {
      const app = await getApp();

      const response = await app.request.get('/api/v1/resumes/shared-with-me');

      expect(response.status).toBe(401);
    });
  });

  describe('Resume owner always has full access', () => {
    it('should allow owner to list collaborators after role changes', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');
      await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .set(owner.bearer())
        .send({ role: 'EDITOR' });

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/collaborators`)
        .set(owner.bearer());

      expect(response.status).toBe(200);
      expect(response.body.collaborators.length).toBeGreaterThanOrEqual(1);
    });

    it('should not allow adding owner as collaborator to own resume', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);

      const response = await invite(app, owner, resumeId, owner.userId, 'VIEWER');

      // Should reject - owner cannot be a collaborator on their own resume
      expect([400, 409, 422]).toContain(response.status);
    });
  });

  describe('Remove collaborator', () => {
    it('should remove collaborator', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator2 = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator2.userId, 'EDITOR');

      const response = await app.request
        .delete(`/api/v1/resumes/${resumeId}/collaborators/${collaborator2.userId}`)
        .set(owner.bearer());

      // Handler returns a JSON envelope, so 200 — not 204 (which is body-less).
      expect(response.status).toBe(200);
    });

    it('should no longer list removed collaborator', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator2 = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator2.userId, 'EDITOR');
      await app.request
        .delete(`/api/v1/resumes/${resumeId}/collaborators/${collaborator2.userId}`)
        .set(owner.bearer());

      const response = await app.request
        .get(`/api/v1/resumes/${resumeId}/collaborators`)
        .set(owner.bearer());

      expect(response.status).toBe(200);

      const userIds = response.body.collaborators.map((c: { userId: string }) => c.userId);
      expect(userIds).not.toContain(collaborator2.userId);
    });

    it('should reject removal by non-owner', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      const outsider = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .delete(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .set(outsider.bearer());

      expect([403, 404]).toContain(response.status);
    });

    it('should reject removal without authentication', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request.delete(
        `/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`,
      );

      expect(response.status).toBe(401);
    });

    it('should handle removing already-removed collaborator gracefully', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator2 = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator2.userId, 'EDITOR');
      await app.request
        .delete(`/api/v1/resumes/${resumeId}/collaborators/${collaborator2.userId}`)
        .set(owner.bearer());

      const response = await app.request
        .delete(`/api/v1/resumes/${resumeId}/collaborators/${collaborator2.userId}`)
        .set(owner.bearer());

      // Should be idempotent (204) or return 404
      expect([204, 404]).toContain(response.status);
    });

    it('should return 404 for removing collaborator from non-existent resume', async () => {
      const app = await getApp();
      const { owner } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      const fakeResumeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request
        .delete(`/api/v1/resumes/${fakeResumeId}/collaborators/${collaborator.userId}`)
        .set(owner.bearer());

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Security: Authorization bypass attempts', () => {
    it('should not allow outsider to invite collaborators', async () => {
      const app = await getApp();
      const { resumeId } = await freshOwnerWithResume(app);
      const outsider = await freshInDbUser(app);

      const response = await app.request
        .post(`/api/v1/resumes/${resumeId}/collaborators`)
        .set(outsider.bearer())
        .send({ userId: outsider.userId, role: 'ADMIN' });

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow outsider to modify collaborator roles', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      const outsider = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .set(outsider.bearer())
        .send({ role: 'ADMIN' });

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow outsider to remove collaborators', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      const outsider = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      const response = await app.request
        .delete(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .set(outsider.bearer());

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow VIEWER to escalate their own role', async () => {
      const app = await getApp();
      const { owner, resumeId } = await freshOwnerWithResume(app);
      const collaborator = await freshInDbUser(app);
      await invite(app, owner, resumeId, collaborator.userId, 'VIEWER');

      // Collaborator tries to escalate self to ADMIN
      const response = await app.request
        .patch(`/api/v1/resumes/${resumeId}/collaborators/${collaborator.userId}`)
        .set(collaborator.bearer())
        .send({ role: 'ADMIN' });

      expect([403, 401]).toContain(response.status);
    });

    it('should not expose collaborator data for non-existent resume', async () => {
      const app = await getApp();
      const { owner } = await freshOwnerWithResume(app);
      const fakeResumeId = '00000000-0000-0000-0000-000000000000';

      const response = await app.request
        .get(`/api/v1/resumes/${fakeResumeId}/collaborators`)
        .set(owner.bearer());

      expect([403, 404]).toContain(response.status);
    });
  });
});
