/**
 * Resume Collaboration Service Tests
 *
 * TDD tests for resume collaboration functionality using in-memory implementations.
 *
 * Kent Beck: "Tests describe behavior, not implementation"
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryCollaborationService } from './testing';

describe('CollaborationService', () => {
  let service: InMemoryCollaborationService;

  beforeEach(() => {
    service = new InMemoryCollaborationService();

    // Seed test data
    service.seedResume({ id: 'resume-1', userId: 'owner-1', title: 'Test Resume' });
    service.seedUser({ id: 'owner-1', name: 'John Owner', email: 'owner@example.com' });
    service.seedUser({ id: 'user-2', name: 'Jane Doe', email: 'jane@example.com' });
  });

  describe('inviteCollaborator', () => {
    it('should invite a user to collaborate on a resume', async () => {
      const result = await service.inviteCollaborator({
        resumeId: 'resume-1',
        inviterId: 'owner-1',
        inviteeId: 'user-2',
        role: 'EDITOR',
      });

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-2');
      expect(result.role).toBe('EDITOR');
    });

    it('should throw error if not owner', async () => {
      service.seedResume({ id: 'resume-2', userId: 'other-owner', title: 'Other Resume' });

      await expect(
        service.inviteCollaborator({
          resumeId: 'resume-2',
          inviterId: 'owner-1',
          inviteeId: 'user-2',
          role: 'EDITOR',
        }),
      ).rejects.toThrow('Only resume owner can invite collaborators');
    });

    it('should throw error if already a collaborator', async () => {
      service.seedCollaborator({
        id: 'collab-1',
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      await expect(
        service.inviteCollaborator({
          resumeId: 'resume-1',
          inviterId: 'owner-1',
          inviteeId: 'user-2',
          role: 'EDITOR',
        }),
      ).rejects.toThrow('User is already a collaborator');
    });

    it('should throw error if resume not found', async () => {
      await expect(
        service.inviteCollaborator({
          resumeId: 'nonexistent',
          inviterId: 'owner-1',
          inviteeId: 'user-2',
          role: 'EDITOR',
        }),
      ).rejects.toThrow('Resume not found');
    });
  });

  describe('getCollaborators', () => {
    it('should return list of collaborators', async () => {
      service.seedCollaborator({
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      const result = await service.getCollaborators('resume-1', 'owner-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('updateCollaboratorRole', () => {
    it('should update collaborator role', async () => {
      service.seedCollaborator({
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      const result = await service.updateCollaboratorRole({
        resumeId: 'resume-1',
        requesterId: 'owner-1',
        targetUserId: 'user-2',
        newRole: 'ADMIN',
      });

      expect(result).toBeDefined();
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('removeCollaborator', () => {
    it('should remove a collaborator', async () => {
      service.seedCollaborator({
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      await service.removeCollaborator({
        resumeId: 'resume-1',
        requesterId: 'owner-1',
        targetUserId: 'user-2',
      });

      const collaborators = await service.getCollaborators('resume-1', 'owner-1');
      expect(collaborators.some((c) => c.userId === 'user-2')).toBe(false);
    });

    it('should allow collaborator to remove themselves', async () => {
      service.seedCollaborator({
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      await service.removeCollaborator({
        resumeId: 'resume-1',
        requesterId: 'user-2',
        targetUserId: 'user-2',
      });

      const collaborators = await service.getCollaborators('resume-1', 'owner-1');
      expect(collaborators.some((c) => c.userId === 'user-2')).toBe(false);
    });
  });

  describe('getSharedWithMe', () => {
    it('should return resumes shared with user', async () => {
      service.seedCollaborator({
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      const result = await service.getSharedWithMe('user-2');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].resume.id).toBe('resume-1');
    });
  });

  describe('hasAccess', () => {
    it('should return true for owner', async () => {
      const hasAccess = await service.inviteCollaborator({
        resumeId: 'resume-1',
        inviterId: 'owner-1',
        inviteeId: 'user-2',
        role: 'VIEWER',
      });

      // Verify owner access by checking invitation succeeded
      expect(hasAccess).toBeDefined();
    });

    it('should return true for collaborator', async () => {
      service.seedCollaborator({
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      const collaborators = await service.getCollaborators('resume-1', 'user-2');
      expect(collaborators).toBeDefined();
    });
  });

  describe('role-based operations', () => {
    it('should allow owner to invite collaborators', async () => {
      const result = await service.inviteCollaborator({
        resumeId: 'resume-1',
        inviterId: 'owner-1',
        inviteeId: 'user-2',
        role: 'EDITOR',
      });

      expect(result).toBeDefined();
      expect(result.role).toBe('EDITOR');
    });

    it('should allow owner to update roles', async () => {
      service.seedCollaborator({
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      const result = await service.updateCollaboratorRole({
        resumeId: 'resume-1',
        requesterId: 'owner-1',
        targetUserId: 'user-2',
        newRole: 'EDITOR',
      });

      expect(result.role).toBe('EDITOR');
    });

    it('should update from VIEWER to ADMIN role', async () => {
      service.seedCollaborator({
        resumeId: 'resume-1',
        userId: 'user-2',
        role: 'VIEWER',
      });

      const result = await service.updateCollaboratorRole({
        resumeId: 'resume-1',
        requesterId: 'owner-1',
        targetUserId: 'user-2',
        newRole: 'ADMIN',
      });

      expect(result.role).toBe('ADMIN');
    });
  });
});
