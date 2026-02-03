/**
 * Collaboration Controller Tests
 *
 * TDD tests for collaboration REST endpoints.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';

describe('CollaborationController', () => {
  let controller: CollaborationController;
  let mockCollaborationService: {
    inviteCollaborator: ReturnType<typeof mock>;
    getCollaborators: ReturnType<typeof mock>;
    updateCollaboratorRole: ReturnType<typeof mock>;
    removeCollaborator: ReturnType<typeof mock>;
    getSharedWithMe: ReturnType<typeof mock>;
  };

  const mockUser = { userId: 'user-1', email: 'test@example.com' };

  const mockCollaborator = {
    id: 'collab-1',
    resumeId: 'resume-1',
    userId: 'user-2',
    role: 'EDITOR',
    invitedBy: 'user-1',
    invitedAt: new Date(),
    joinedAt: new Date(),
    user: { id: 'user-2', name: 'Jane Doe', email: 'jane@example.com' },
  };

  beforeEach(async () => {
    mockCollaborationService = {
      inviteCollaborator: mock(() => Promise.resolve(mockCollaborator)),
      getCollaborators: mock(() => Promise.resolve([mockCollaborator])),
      updateCollaboratorRole: mock(() => Promise.resolve(mockCollaborator)),
      removeCollaborator: mock(() => Promise.resolve()),
      getSharedWithMe: mock(() =>
        Promise.resolve([
          {
            role: 'EDITOR',
            invitedAt: new Date(),
            resume: { id: 'resume-1', title: 'Test' },
          },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollaborationController],
      providers: [
        { provide: CollaborationService, useValue: mockCollaborationService },
      ],
    }).compile();

    controller = module.get<CollaborationController>(CollaborationController);
  });

  describe('invite', () => {
    it('should invite a collaborator', async () => {
      const result = await controller.invite(
        'resume-1',
        { userId: 'user-2', role: 'EDITOR' },
        mockUser as any,
      );

      expect(result).toBeDefined();
      expect(mockCollaborationService.inviteCollaborator).toHaveBeenCalledWith({
        resumeId: 'resume-1',
        inviterId: 'user-1',
        inviteeId: 'user-2',
        role: 'EDITOR',
      });
    });
  });

  describe('getCollaborators', () => {
    it('should return list of collaborators', async () => {
      const result = await controller.getCollaborators(
        'resume-1',
        mockUser as any,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockCollaborationService.getCollaborators).toHaveBeenCalledWith(
        'resume-1',
        'user-1',
      );
    });
  });

  describe('updateRole', () => {
    it('should update collaborator role', async () => {
      const result = await controller.updateRole(
        'resume-1',
        'user-2',
        { role: 'ADMIN' },
        mockUser as any,
      );

      expect(result).toBeDefined();
      expect(
        mockCollaborationService.updateCollaboratorRole,
      ).toHaveBeenCalledWith({
        resumeId: 'resume-1',
        requesterId: 'user-1',
        targetUserId: 'user-2',
        newRole: 'ADMIN',
      });
    });
  });

  describe('remove', () => {
    it('should remove a collaborator', async () => {
      await controller.remove('resume-1', 'user-2', mockUser as any);

      expect(mockCollaborationService.removeCollaborator).toHaveBeenCalledWith({
        resumeId: 'resume-1',
        requesterId: 'user-1',
        targetUserId: 'user-2',
      });
    });
  });

  describe('getSharedWithMe', () => {
    it('should return resumes shared with user', async () => {
      const result = await controller.getSharedWithMe(mockUser as any);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockCollaborationService.getSharedWithMe).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });
});
