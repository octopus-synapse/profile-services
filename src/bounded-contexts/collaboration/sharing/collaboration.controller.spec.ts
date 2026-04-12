/**
 * Collaboration Controller Tests
 *
 * Pure tests using in-memory implementations (no mocks).
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { buildCollaborationUseCases } from './application/collaboration.composition';
import { CollaborationController } from './collaboration.controller';
import { InMemoryCollaborationRepository } from './testing';

const noopEventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
};

describe('CollaborationController', () => {
  let controller: CollaborationController;
  let repo: InMemoryCollaborationRepository;
  type AuthUser = Parameters<CollaborationController['invite']>[2];

  const mockUser = {
    userId: 'user-1',
    email: 'test@example.com',
  } as unknown as AuthUser;

  beforeEach(() => {
    repo = new InMemoryCollaborationRepository();
    const useCases = buildCollaborationUseCases(repo, noopEventPublisher);
    controller = new CollaborationController(useCases);

    repo.seedResume({
      id: 'resume-1',
      userId: 'user-1',
      title: 'Test Resume',
    });
    repo.seedUser({
      id: 'user-2',
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
  });

  describe('invite', () => {
    it('should invite a collaborator', async () => {
      const result = await controller.invite(
        'resume-1',
        { userId: 'user-2', role: 'EDITOR' },
        mockUser,
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data?.collaborator.userId).toBe('user-2');
      expect(result.data?.collaborator.role).toBe('EDITOR');
    });
  });

  describe('getCollaborators', () => {
    it('should return list of collaborators', async () => {
      await controller.invite('resume-1', { userId: 'user-2', role: 'EDITOR' }, mockUser);

      const result = await controller.getCollaborators('resume-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data?.collaborators)).toBe(true);
      expect(result.data?.collaborators).toHaveLength(1);
    });
  });

  describe('updateRole', () => {
    it('should update collaborator role', async () => {
      await controller.invite('resume-1', { userId: 'user-2', role: 'EDITOR' }, mockUser);

      const result = await controller.updateRole('resume-1', 'user-2', { role: 'ADMIN' }, mockUser);

      expect(result).toBeDefined();
      expect(result.data?.collaborator.role).toBe('ADMIN');
    });
  });

  describe('remove', () => {
    it('should remove a collaborator', async () => {
      await controller.invite('resume-1', { userId: 'user-2', role: 'EDITOR' }, mockUser);

      await controller.remove('resume-1', 'user-2', mockUser);

      const result = await controller.getCollaborators('resume-1', mockUser);
      expect(result.data?.collaborators).toHaveLength(0);
    });
  });

  describe('getSharedWithMe', () => {
    it('should return resumes shared with user', async () => {
      repo.seedResume({
        id: 'resume-2',
        userId: 'other-user',
        title: 'Shared Resume',
      });
      repo.seedCollaborator({
        resumeId: 'resume-2',
        userId: 'user-1',
        role: 'EDITOR',
      });

      const result = await controller.getSharedWithMe(mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data?.sharedResumes)).toBe(true);
      expect(result.data?.sharedResumes).toHaveLength(1);
    });
  });
});
