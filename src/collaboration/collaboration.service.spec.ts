/**
 * Resume Collaboration Service Tests
 *
 * TDD tests for resume collaboration functionality.
 *
 * Kent Beck: "Tests describe behavior, not implementation"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMockResume } from '../../test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { CollaborationService } from './collaboration.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

describe('CollaborationService', () => {
  let service: CollaborationService;
  let mockPrismaService: {
    resumeCollaborator: {
      findFirst: ReturnType<typeof mock>;
      findMany: ReturnType<typeof mock>;
      create: ReturnType<typeof mock>;
      update: ReturnType<typeof mock>;
      delete: ReturnType<typeof mock>;
    };
    resume: {
      findUnique: ReturnType<typeof mock>;
    };
  };

  const mockResume = createMockResume({
    id: 'resume-1',
    userId: 'owner-1',
    title: 'Test Resume',
  });

  const mockCollaborator = {
    id: 'collab-1',
    resumeId: 'resume-1',
    userId: 'user-2',
    role: 'EDITOR',
    invitedBy: 'owner-1',
    invitedAt: new Date(),
    joinedAt: new Date(),
    user: { id: 'user-2', name: 'Jane Doe', email: 'jane@example.com' },
  };

  beforeEach(async () => {
    mockPrismaService = {
      resumeCollaborator: {
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([mockCollaborator])),
        create: mock(() => Promise.resolve(mockCollaborator)),
        update: mock(() => Promise.resolve(mockCollaborator)),
        delete: mock(() => Promise.resolve(mockCollaborator)),
      },
      resume: {
        findUnique: mock(() => Promise.resolve(mockResume)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CollaborationService>(CollaborationService);
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
      expect(mockPrismaService.resumeCollaborator.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-owner' }),
      );

      await expect(
        service.inviteCollaborator({
          resumeId: 'resume-1',
          inviterId: 'owner-1',
          inviteeId: 'user-2',
          role: 'EDITOR',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if already a collaborator', async () => {
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve(mockCollaborator),
      );

      await expect(
        service.inviteCollaborator({
          resumeId: 'resume-1',
          inviterId: 'owner-1',
          inviteeId: 'user-2',
          role: 'EDITOR',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if resume not found', async () => {
      mockPrismaService.resume.findUnique = mock(() => Promise.resolve(null));

      await expect(
        service.inviteCollaborator({
          resumeId: 'nonexistent',
          inviterId: 'owner-1',
          inviteeId: 'user-2',
          role: 'EDITOR',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCollaborators', () => {
    it('should return list of collaborators', async () => {
      const result = await service.getCollaborators('resume-1', 'owner-1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrismaService.resumeCollaborator.findMany).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner or collaborator', async () => {
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-owner' }),
      );
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve(null),
      );

      await expect(
        service.getCollaborators('resume-1', 'random-user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateCollaboratorRole', () => {
    it('should update collaborator role', async () => {
      const result = await service.updateCollaboratorRole({
        resumeId: 'resume-1',
        requesterId: 'owner-1',
        targetUserId: 'user-2',
        newRole: 'ADMIN',
      });

      expect(result).toBeDefined();
      expect(mockPrismaService.resumeCollaborator.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-owner' }),
      );

      await expect(
        service.updateCollaboratorRole({
          resumeId: 'resume-1',
          requesterId: 'not-owner',
          targetUserId: 'user-2',
          newRole: 'ADMIN',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeCollaborator', () => {
    it('should remove a collaborator', async () => {
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve(mockCollaborator),
      );

      await service.removeCollaborator({
        resumeId: 'resume-1',
        requesterId: 'owner-1',
        targetUserId: 'user-2',
      });

      expect(mockPrismaService.resumeCollaborator.delete).toHaveBeenCalled();
    });

    it('should allow collaborator to remove themselves', async () => {
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve(mockCollaborator),
      );

      await service.removeCollaborator({
        resumeId: 'resume-1',
        requesterId: 'user-2',
        targetUserId: 'user-2',
      });

      expect(mockPrismaService.resumeCollaborator.delete).toHaveBeenCalled();
    });
  });

  describe('getSharedWithMe', () => {
    it('should return resumes shared with user', async () => {
      mockPrismaService.resumeCollaborator.findMany = mock(() =>
        Promise.resolve([
          {
            ...mockCollaborator,
            resume: { id: 'resume-1', title: 'Shared Resume' },
          },
        ]),
      );

      const result = await service.getSharedWithMe('user-2');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('hasAccess', () => {
    it('should return true for owner', async () => {
      const result = await service.hasAccess('resume-1', 'owner-1');

      expect(result).toBe(true);
    });

    it('should return true for collaborator', async () => {
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-owner' }),
      );
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve(mockCollaborator),
      );

      const result = await service.hasAccess('resume-1', 'user-2');

      expect(result).toBe(true);
    });

    it('should return false for non-collaborator', async () => {
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-owner' }),
      );
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve(null),
      );

      const result = await service.hasAccess('resume-1', 'random-user');

      expect(result).toBe(false);
    });
  });

  describe('canEdit', () => {
    it('should return true for owner', async () => {
      const result = await service.canEdit('resume-1', 'owner-1');

      expect(result).toBe(true);
    });

    it('should return true for EDITOR role', async () => {
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-owner' }),
      );
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve({ ...mockCollaborator, role: 'EDITOR' }),
      );

      const result = await service.canEdit('resume-1', 'user-2');

      expect(result).toBe(true);
    });

    it('should return true for ADMIN role', async () => {
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-owner' }),
      );
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve({ ...mockCollaborator, role: 'ADMIN' }),
      );

      const result = await service.canEdit('resume-1', 'user-2');

      expect(result).toBe(true);
    });

    it('should return false for VIEWER role', async () => {
      mockPrismaService.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-owner' }),
      );
      mockPrismaService.resumeCollaborator.findFirst = mock(() =>
        Promise.resolve({ ...mockCollaborator, role: 'VIEWER' }),
      );

      const result = await service.canEdit('resume-1', 'user-2');

      expect(result).toBe(false);
    });
  });
});
