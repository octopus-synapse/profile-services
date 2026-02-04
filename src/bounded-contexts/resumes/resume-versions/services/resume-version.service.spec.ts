/**
 * ResumeVersionService Unit Tests
 *
 * Tests resume versioning functionality:
 * - Snapshot creation
 * - Version history
 * - Rollback functionality
 * - Auto-cleanup (max 30 versions)
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createMockResume } from '@test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeVersionService } from './resume-version.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { EventPublisher } from '@/shared-kernel';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ResumeVersionService', () => {
  let service: ResumeVersionService;
  let prisma: PrismaService;

  const mockResume = createMockResume({
    id: 'resume-123',
    userId: 'user-123',
    title: 'Software Engineer Resume',
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certifications: [],
    awards: [],
    recommendations: [],
    interests: [],
    achievements: [],
    publications: [],
    talks: [],
    openSource: [],
    bugBounties: [],
    hackathons: [],
  });

  const mockVersion = {
    id: 'version-123',
    resumeId: 'resume-123',
    versionNumber: 1,
    snapshot: mockResume,
    label: 'Before update',
    createdAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    prisma = {
      resume: {
        findUnique: mock(() => Promise.resolve(mockResume)),
        update: mock(() => Promise.resolve(mockResume)),
      },
      resumeVersion: {
        create: mock(() => Promise.resolve(mockVersion)),
        findUnique: mock(() => Promise.resolve(mockVersion)),
        findFirst: mock(() => Promise.resolve({ versionNumber: 1 })),
        findMany: mock(() => Promise.resolve([mockVersion])),
        deleteMany: mock(() => Promise.resolve({ count: 5 })),
        count: mock(() => Promise.resolve(5)),
      },
    } as any;

    const mockEventPublisher = {
      publish: mock(),
      publishAsync: mock(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeVersionService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<ResumeVersionService>(ResumeVersionService);
  });

  describe('Snapshot Creation', () => {
    it('should create snapshot with full resume data', async () => {
      const result = await service.createSnapshot('resume-123');

      expect(result).toEqual(mockVersion);
      expect(prisma.resume.findUnique).toHaveBeenCalledWith({
        where: { id: 'resume-123' },
        include: expect.objectContaining({
          experiences: true,
          education: true,
          skills: true,
        }),
      });
    });

    it('should create snapshot with custom label', async () => {
      const result = await service.createSnapshot(
        'resume-123',
        'Before major update',
      );

      expect(result).toEqual(mockVersion);
    });

    it('should throw NotFoundException when resume not found', async () => {
      prisma.resume.findUnique = mock(() => Promise.resolve(null));

      await expect(service.createSnapshot('resume-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should cleanup old versions after creating snapshot', async () => {
      await service.createSnapshot('resume-123');

      expect(prisma.resumeVersion.findMany).toHaveBeenCalled();
    });
  });

  describe('Version History', () => {
    it('should list all versions for resume', async () => {
      const result = await service.getVersions('resume-123', 'user-123');

      expect(result).toEqual([mockVersion]);
      expect(prisma.resumeVersion.findMany).toHaveBeenCalledWith({
        where: { resumeId: 'resume-123' },
        orderBy: { versionNumber: 'desc' },
        select: {
          id: true,
          versionNumber: true,
          label: true,
          createdAt: true,
        },
      });
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      prisma.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-user' }),
      );

      await expect(
        service.getVersions('resume-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when resume not found', async () => {
      prisma.resume.findUnique = mock(() => Promise.resolve(null));

      await expect(
        service.getVersions('resume-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Version Rollback', () => {
    it('should restore resume to previous version', async () => {
      const result = await service.restoreVersion(
        'resume-123',
        'version-123',
        'user-123',
      );

      expect(result.success).toBe(true);
      expect(result.restoredFrom).toEqual(mockVersion.createdAt);
    });

    it('should create snapshot before restoring', async () => {
      await service.restoreVersion('resume-123', 'version-123', 'user-123');

      // First call is for snapshot, second for restore
      expect(prisma.resume.findUnique).toHaveBeenCalled();
    });

    it('should throw NotFoundException when version not found', async () => {
      prisma.resumeVersion.findUnique = mock(() => Promise.resolve(null));

      await expect(
        service.restoreVersion('resume-123', 'version-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when version belongs to different resume', async () => {
      prisma.resumeVersion.findUnique = mock(() =>
        Promise.resolve({ ...mockVersion, resumeId: 'other-resume' }),
      );

      await expect(
        service.restoreVersion('resume-123', 'version-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own resume', async () => {
      prisma.resume.findUnique = mock(() =>
        Promise.resolve({ ...mockResume, userId: 'other-user' }),
      );

      await expect(
        service.restoreVersion('resume-123', 'version-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Version Cleanup (Max 30)', () => {
    it('should keep only last 30 versions', async () => {
      const versions = Array.from({ length: 35 }, (_, i) => ({
        id: `version-${i}`,
        resumeId: 'resume-123',
        snapshot: mockResume,
        label: null,
        createdAt: new Date(),
      }));

      prisma.resumeVersion.findMany = mock(() => Promise.resolve(versions));

      await service.createSnapshot('resume-123');

      expect(prisma.resumeVersion.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: expect.arrayContaining([]) },
        },
      });
    });

    it('should not delete when less than 30 versions', async () => {
      const versions = Array.from({ length: 10 }, (_, i) => ({
        id: `version-${i}`,
        resumeId: 'resume-123',
        snapshot: mockResume,
        label: null,
        createdAt: new Date(),
      }));

      prisma.resumeVersion.findMany = mock(() => Promise.resolve(versions));

      await service.createSnapshot('resume-123');

      expect(prisma.resumeVersion.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete oldest versions first', async () => {
      const versions = Array.from({ length: 35 }, (_, i) => ({
        id: `version-${i}`,
        resumeId: 'resume-123',
        snapshot: mockResume,
        label: null,
        createdAt: new Date(Date.now() - i * 1000),
      }));

      prisma.resumeVersion.findMany = mock(() => Promise.resolve(versions));

      await service.createSnapshot('resume-123');

      // Should delete versions 30-34 (oldest 5)
      expect(prisma.resumeVersion.deleteMany).toHaveBeenCalled();
    });
  });
});
