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
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import {
  closeApp,
  createTestUserAndLogin,
  getApp,
  getPrisma,
  getRequest,
  uniqueTestId,
} from './setup';

const describeIntegration =
  process.env.DATABASE_URL && !process.env.SKIP_INTEGRATION ? describe : describe.skip;

describeIntegration('Collaboration Integration Tests', () => {
  // Owner of the resume
  let ownerToken: string;
  let ownerUserId: string;
  let resumeId: string;

  // Collaborator user
  let collaboratorToken: string;
  let collaboratorUserId: string;

  // Second collaborator
  let collaborator2Token: string;
  let collaborator2UserId: string;

  // Non-collaborator (outsider)
  let outsiderToken: string;
  let outsiderUserId: string;

  beforeAll(async () => {
    await getApp();

    // Create the resume owner
    const ownerAuth = await createTestUserAndLogin({
      email: `collab-owner-${uniqueTestId()}@example.com`,
    });
    ownerToken = ownerAuth.accessToken;
    ownerUserId = ownerAuth.userId;

    // Create a resume for the owner
    const resumeResponse = await getRequest()
      .post('/api/v1/resumes')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: `Collab Test Resume ${uniqueTestId()}` });

    if (resumeResponse.status === 201) {
      resumeId = resumeResponse.body.data?.id || resumeResponse.body.data?.resumeId;
    } else {
      throw new Error(
        `Failed to create resume: ${resumeResponse.status} ${JSON.stringify(resumeResponse.body)}`,
      );
    }

    // Create collaborator users
    const collabAuth = await createTestUserAndLogin({
      email: `collab-user-${uniqueTestId()}@example.com`,
    });
    collaboratorToken = collabAuth.accessToken;
    collaboratorUserId = collabAuth.userId;

    const collab2Auth = await createTestUserAndLogin({
      email: `collab-user2-${uniqueTestId()}@example.com`,
    });
    collaborator2Token = collab2Auth.accessToken;
    collaborator2UserId = collab2Auth.userId;

    // Create outsider user
    const outsiderAuth = await createTestUserAndLogin({
      email: `collab-outsider-${uniqueTestId()}@example.com`,
    });
    outsiderToken = outsiderAuth.accessToken;
    outsiderUserId = outsiderAuth.userId;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    for (const uid of [ownerUserId, collaboratorUserId, collaborator2UserId, outsiderUserId]) {
      if (uid) {
        await prisma.resume.deleteMany({ where: { userId: uid } });
        await prisma.user.deleteMany({ where: { id: uid } });
      }
    }
    await closeApp();
  });

  describe('Add collaborator to resume', () => {
    it('should invite a collaborator as VIEWER', async () => {
      const response = await getRequest()
        .post(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: collaboratorUserId,
          role: 'VIEWER',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborator).toBeDefined();
      expect(response.body.data.collaborator.userId).toBe(collaboratorUserId);
      expect(response.body.data.collaborator.role).toBe('VIEWER');
    });

    it('should invite a second collaborator as EDITOR', async () => {
      const response = await getRequest()
        .post(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: collaborator2UserId,
          role: 'EDITOR',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborator.role).toBe('EDITOR');
    });

    it('should reject invitation without authentication', async () => {
      const response = await getRequest().post(`/api/resumes/${resumeId}/collaborators`).send({
        userId: outsiderUserId,
        role: 'VIEWER',
      });

      expect(response.status).toBe(401);
    });

    it('should reject invitation with invalid role', async () => {
      const response = await getRequest()
        .post(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: outsiderUserId,
          role: 'INVALID_ROLE',
        });

      expect(response.status).toBe(400);
    });

    it('should reject invitation with empty userId', async () => {
      const response = await getRequest()
        .post(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: '',
          role: 'VIEWER',
        });

      expect(response.status).toBe(400);
    });

    it('should handle adding the same collaborator twice', async () => {
      const response = await getRequest()
        .post(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: collaboratorUserId,
          role: 'VIEWER',
        });

      // Should be idempotent (200/201) or return conflict (409)
      expect([200, 201, 409]).toContain(response.status);
    });
  });

  describe('List collaborators', () => {
    it('should list all collaborators for resume owner', async () => {
      const response = await getRequest()
        .get(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborators).toBeDefined();
      expect(Array.isArray(response.body.data.collaborators)).toBe(true);
      expect(response.body.data.collaborators.length).toBeGreaterThanOrEqual(2);

      // Should contain both collaborators
      const userIds = response.body.data.collaborators.map((c: { userId: string }) => c.userId);
      expect(userIds).toContain(collaboratorUserId);
      expect(userIds).toContain(collaborator2UserId);
    });

    it('should allow collaborator to list collaborators', async () => {
      const response = await getRequest()
        .get(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${collaboratorToken}`);

      // Collaborators should be able to see who else collaborates
      expect([200, 403]).toContain(response.status);
    });

    it('should reject listing without authentication', async () => {
      const response = await getRequest().get(`/api/resumes/${resumeId}/collaborators`);

      expect(response.status).toBe(401);
    });

    it('should reject listing by non-collaborator', async () => {
      const response = await getRequest()
        .get(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Update collaborator role', () => {
    it('should update collaborator role from VIEWER to EDITOR', async () => {
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'EDITOR' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborator.role).toBe('EDITOR');
    });

    it('should update collaborator role to ADMIN', async () => {
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaborator2UserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(200);
      expect(response.body.data.collaborator.role).toBe('ADMIN');
    });

    it('should reject role update with invalid role', async () => {
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'SUPERADMIN' });

      expect(response.status).toBe(400);
    });

    it('should reject role update by non-owner', async () => {
      // VIEWER/EDITOR should not be able to change roles
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaborator2UserId}`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ role: 'VIEWER' });

      expect([403, 401]).toContain(response.status);
    });

    it('should reject role update by outsider', async () => {
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ role: 'ADMIN' });

      expect([403, 404]).toContain(response.status);
    });

    it('should reject role update without authentication', async () => {
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .send({ role: 'EDITOR' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for updating non-existent collaborator', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${fakeUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'VIEWER' });

      expect([404, 400]).toContain(response.status);
    });
  });

  describe('Collaborator access to shared resume', () => {
    it('should allow collaborator to see shared resumes', async () => {
      const response = await getRequest()
        .get('/api/resumes/shared-with-me')
        .set('Authorization', `Bearer ${collaboratorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sharedResumes).toBeDefined();
      expect(Array.isArray(response.body.data.sharedResumes)).toBe(true);

      // Should include the resume we shared
      const sharedResumeIds = response.body.data.sharedResumes.map(
        (sr: { resume: { id: string } }) => sr.resume?.id,
      );
      expect(sharedResumeIds).toContain(resumeId);
    });

    it('should not show shared resumes to outsider', async () => {
      const response = await getRequest()
        .get('/api/resumes/shared-with-me')
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(response.status).toBe(200);

      // Outsider should have empty or no matching shared resumes
      const sharedResumeIds = (response.body.data.sharedResumes || []).map(
        (sr: { resume: { id: string } }) => sr.resume?.id,
      );
      expect(sharedResumeIds).not.toContain(resumeId);
    });

    it('should reject shared-with-me without authentication', async () => {
      const response = await getRequest().get('/api/resumes/shared-with-me');

      expect(response.status).toBe(401);
    });
  });

  describe('Resume owner always has full access', () => {
    it('should allow owner to list collaborators after role changes', async () => {
      const response = await getRequest()
        .get(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.collaborators.length).toBeGreaterThanOrEqual(1);
    });

    it('should not allow adding owner as collaborator to own resume', async () => {
      const response = await getRequest()
        .post(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: ownerUserId,
          role: 'VIEWER',
        });

      // Should reject - owner cannot be a collaborator on their own resume
      expect([400, 409, 422]).toContain(response.status);
    });
  });

  describe('Remove collaborator', () => {
    it('should remove collaborator', async () => {
      const response = await getRequest()
        .delete(`/api/resumes/${resumeId}/collaborators/${collaborator2UserId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(204);
    });

    it('should no longer list removed collaborator', async () => {
      const response = await getRequest()
        .get(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);

      const userIds = response.body.data.collaborators.map((c: { userId: string }) => c.userId);
      expect(userIds).not.toContain(collaborator2UserId);
    });

    it('should reject removal by non-owner', async () => {
      const response = await getRequest()
        .delete(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should reject removal without authentication', async () => {
      const response = await getRequest().delete(
        `/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`,
      );

      expect(response.status).toBe(401);
    });

    it('should handle removing already-removed collaborator gracefully', async () => {
      const response = await getRequest()
        .delete(`/api/resumes/${resumeId}/collaborators/${collaborator2UserId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Should be idempotent (204) or return 404
      expect([204, 404]).toContain(response.status);
    });

    it('should return 404 for removing collaborator from non-existent resume', async () => {
      const fakeResumeId = '00000000-0000-0000-0000-000000000000';
      const response = await getRequest()
        .delete(`/api/resumes/${fakeResumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Security: Authorization bypass attempts', () => {
    it('should not allow outsider to invite collaborators', async () => {
      const response = await getRequest()
        .post(`/api/resumes/${resumeId}/collaborators`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({
          userId: outsiderUserId,
          role: 'ADMIN',
        });

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow outsider to modify collaborator roles', async () => {
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ role: 'ADMIN' });

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow outsider to remove collaborators', async () => {
      const response = await getRequest()
        .delete(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow VIEWER to escalate their own role', async () => {
      // First, re-add collaborator as VIEWER if they were changed
      await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'VIEWER' });

      // Collaborator tries to escalate self to ADMIN
      const response = await getRequest()
        .patch(`/api/resumes/${resumeId}/collaborators/${collaboratorUserId}`)
        .set('Authorization', `Bearer ${collaboratorToken}`)
        .send({ role: 'ADMIN' });

      expect([403, 401]).toContain(response.status);
    });

    it('should not expose collaborator data for non-existent resume', async () => {
      const fakeResumeId = '00000000-0000-0000-0000-000000000000';
      const response = await getRequest()
        .get(`/api/resumes/${fakeResumeId}/collaborators`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });
});
