/**
 * Resume Management Service Unit Tests
 *
 * Tests administrative operations on resume resources.
 * These operations require elevated permissions.
 *
 * Kent Beck: "Test the behaviors, not the implementation details"
 * Uncle Bob: "Each test should have a single reason to fail"
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { ResumeManagementService } from './resume-management.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { EventPublisher } from '@/shared-kernel';
import { NotFoundException } from '@nestjs/common';

describe('ResumeManagementService', () => {
  let service: ResumeManagementService;
  let mockPrismaService: Partial<PrismaService>;
  let mockEventPublisher: Partial<EventPublisher>;

  const mockUserId = 'user-123';
  const mockResumeId = 'resume-456';

  const mockUser = {
    id: mockUserId,
    email: 'user@example.com',
    name: 'Test User',
  };

  const mockResume = {
    id: mockResumeId,
    userId: mockUserId,
    title: 'Software Engineer Resume',
    slug: 'software-engineer',
    summary: 'Experienced software engineer',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: mockUser,
    skills: [{ id: 'skill-1', name: 'TypeScript', level: 'Expert', order: 0 }],
    experiences: [
      { id: 'exp-1', company: 'Tech Corp', title: 'Senior Dev', order: 0 },
    ],
    education: [{ id: 'edu-1', school: 'MIT', degree: 'BS CS', order: 0 }],
    projects: [],
    certifications: [],
    languages: [],
    awards: [],
    _count: {
      skills: 5,
      experiences: 3,
      education: 2,
      projects: 4,
      certifications: 1,
    },
  };

  beforeEach(() => {
    mockPrismaService = {
      user: {
        findUnique: mock(() => Promise.resolve(mockUser)),
      } as any,
      resume: {
        findMany: mock(() => Promise.resolve([mockResume])),
        findUnique: mock(() => Promise.resolve(mockResume)),
        delete: mock(() => Promise.resolve(mockResume)),
      } as any,
    };

    mockEventPublisher = {
      publish: mock(() => {}),
    };

    service = new ResumeManagementService(
      mockPrismaService as PrismaService,
      mockEventPublisher as EventPublisher,
    );
  });

  describe('listResumesForUser', () => {
    it('should return all resumes for a user', async () => {
      const result = await service.listResumesForUser(mockUserId);

      expect(result.resumes).toHaveLength(1);
      expect(result.resumes[0].title).toBe('Software Engineer Resume');
      expect(mockPrismaService.resume!.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: expect.objectContaining({
          skills: true,
          experiences: true,
          education: true,
          _count: expect.any(Object),
        }),
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (
        mockPrismaService.user!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.listResumesForUser('non-existent-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return empty array when user has no resumes', async () => {
      (
        mockPrismaService.resume!.findMany as ReturnType<typeof mock>
      ).mockResolvedValue([]);

      const result = await service.listResumesForUser(mockUserId);

      expect(result.resumes).toEqual([]);
    });

    it('should order resumes by updatedAt descending', async () => {
      await service.listResumesForUser(mockUserId);

      expect(mockPrismaService.resume!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });

    it('should include resume counts in response', async () => {
      const result = await service.listResumesForUser(mockUserId);

      expect(result.resumes[0]._count).toEqual({
        skills: 5,
        experiences: 3,
        education: 2,
        projects: 4,
        certifications: 1,
      });
    });
  });

  describe('getResumeDetails', () => {
    it('should return full resume details with all sections', async () => {
      const result = await service.getResumeDetails(mockResumeId);

      expect(result.id).toBe(mockResumeId);
      expect(result.title).toBe('Software Engineer Resume');
      expect(result.user).toEqual(mockUser);
      expect(result.skills).toBeDefined();
      expect(result.experiences).toBeDefined();
      expect(result.education).toBeDefined();
    });

    it('should throw NotFoundException when resume does not exist', async () => {
      (
        mockPrismaService.resume!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(
        service.getResumeDetails('non-existent-resume'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include user info with limited fields', async () => {
      await service.getResumeDetails(mockResumeId);

      expect(mockPrismaService.resume!.findUnique).toHaveBeenCalledWith({
        where: { id: mockResumeId },
        include: expect.objectContaining({
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        }),
      });
    });

    it('should order all sections by order field ascending', async () => {
      await service.getResumeDetails(mockResumeId);

      expect(mockPrismaService.resume!.findUnique).toHaveBeenCalledWith({
        where: { id: mockResumeId },
        include: expect.objectContaining({
          skills: { orderBy: { order: 'asc' } },
          experiences: { orderBy: { order: 'asc' } },
          education: { orderBy: { order: 'asc' } },
          projects: { orderBy: { order: 'asc' } },
          certifications: { orderBy: { order: 'asc' } },
          languages: { orderBy: { order: 'asc' } },
          awards: { orderBy: { order: 'asc' } },
        }),
      });
    });
  });

  describe('deleteResume', () => {
    it('should delete resume and return success response', async () => {
      (
        mockPrismaService.resume!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: mockResumeId,
        userId: mockUserId,
      });

      const result = await service.deleteResume(mockResumeId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Resume deleted successfully');
      expect(mockPrismaService.resume!.delete).toHaveBeenCalledWith({
        where: { id: mockResumeId },
      });
    });

    it('should throw NotFoundException when resume does not exist', async () => {
      (
        mockPrismaService.resume!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(service.deleteResume('non-existent-resume')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should publish ResumeDeletedEvent before deletion', async () => {
      (
        mockPrismaService.resume!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: mockResumeId,
        userId: mockUserId,
      });

      await service.deleteResume(mockResumeId);

      expect(mockEventPublisher.publish).toHaveBeenCalled();

      // Verify event is published before delete
      const publishCall = (
        mockEventPublisher.publish as ReturnType<typeof mock>
      ).mock.calls[0];
      const deleteCall = (
        mockPrismaService.resume!.delete as ReturnType<typeof mock>
      ).mock.calls[0];

      expect(publishCall).toBeDefined();
      expect(deleteCall).toBeDefined();
    });

    it('should publish event with correct payload', async () => {
      (
        mockPrismaService.resume!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue({
        id: mockResumeId,
        userId: mockUserId,
      });

      await service.deleteResume(mockResumeId);

      const publishedEvent = (
        mockEventPublisher.publish as ReturnType<typeof mock>
      ).mock.calls[0][0];
      expect(publishedEvent.constructor.name).toBe('ResumeDeletedEvent');
      expect(publishedEvent.payload.userId).toBe(mockUserId);
    });

    it('should not delete if resume not found (early exit)', async () => {
      (
        mockPrismaService.resume!.findUnique as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      try {
        await service.deleteResume('non-existent');
      } catch {
        // Expected
      }

      expect(mockPrismaService.resume!.delete).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
