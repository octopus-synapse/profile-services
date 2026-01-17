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
import { createMockResume } from '../../../test/factories/resume.factory';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeVersionService } from './resume-version.service';
import { ResumeVersionRepository } from '../repositories/resume-version.repository';
import {
  ResumeNotFoundError,
  ResourceNotFoundError,
  ResourceOwnershipError,
} from '@octopus-synapse/profile-contracts';

describe('ResumeVersionService', () => {
  let service: ResumeVersionService;
  let repository: ResumeVersionRepository;

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
    const mockFindResumeWithAllRelations = mock();
    const mockFindLastVersion = mock();
    const mockCreate = mock();
    const mockFindAllByResumeId = mock();
    const mockFindById = mock();
    const mockUpdateResume = mock();
    const mockFindResumeOwner = mock();
    const mockDeleteOldVersions = mock();

    repository = {
      findResumeWithAllRelations: mockFindResumeWithAllRelations,
      findLastVersion: mockFindLastVersion,
      create: mockCreate,
      findAllByResumeId: mockFindAllByResumeId,
      findById: mockFindById,
      updateResume: mockUpdateResume,
      findResumeOwner: mockFindResumeOwner,
      deleteOldVersions: mockDeleteOldVersions,
    } as ResumeVersionRepository;

    // Set default mocks
    mockFindResumeWithAllRelations.mockResolvedValue(mockResume);
    mockFindLastVersion.mockResolvedValue({ versionNumber: 1 });
    mockCreate.mockResolvedValue(mockVersion);
    mockFindAllByResumeId.mockResolvedValue([mockVersion]);
    mockFindById.mockResolvedValue(mockVersion);
    mockUpdateResume.mockResolvedValue(mockResume);
    mockFindResumeOwner.mockResolvedValue({ userId: 'user-123' });
    mockDeleteOldVersions.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumeVersionService,
        { provide: ResumeVersionRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<ResumeVersionService>(ResumeVersionService);
  });

  describe('Snapshot Creation', () => {
    it('should create snapshot with full resume data', async () => {
      const result = await service.createSnapshot('resume-123');

      expect(result).toEqual(mockVersion);
      expect(repository.findResumeWithAllRelations).toHaveBeenCalledWith(
        'resume-123',
      );
    });

    it('should create snapshot with custom label', async () => {
      const result = await service.createSnapshot(
        'resume-123',
        'Before major update',
      );

      expect(result).toEqual(mockVersion);
    });

    it('should throw ResumeNotFoundError when resume not found', async () => {
      (
        repository.findResumeWithAllRelations as ReturnType<typeof mock>
      ).mockResolvedValue(null);

      await expect(service.createSnapshot('resume-123')).rejects.toThrow(
        ResumeNotFoundError,
      );
    });

    it('should cleanup old versions after creating snapshot', async () => {
      await service.createSnapshot('resume-123');

      expect(repository.deleteOldVersions).toHaveBeenCalled();
    });
  });

  describe('Version History', () => {
    it('should list all versions for resume', async () => {
      const result = await service.getVersions('resume-123', 'user-123');

      expect(result).toEqual([mockVersion]);
      expect(repository.findAllByResumeId).toHaveBeenCalledWith('resume-123');
    });

    it('should throw ResourceOwnershipError when user does not own resume', async () => {
      (repository.findResumeOwner as ReturnType<typeof mock>).mockResolvedValue(
        { userId: 'other-user' },
      );

      await expect(
        service.getVersions('resume-123', 'user-123'),
      ).rejects.toThrow(ResourceOwnershipError);
    });

    it('should throw ResumeNotFoundError when resume not found', async () => {
      (repository.findResumeOwner as ReturnType<typeof mock>).mockResolvedValue(
        null,
      );

      await expect(
        service.getVersions('resume-123', 'user-123'),
      ).rejects.toThrow(ResumeNotFoundError);
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

      expect(repository.findResumeWithAllRelations).toHaveBeenCalled();
    });

    it('should throw ResourceNotFoundError when version not found', async () => {
      (repository.findById as ReturnType<typeof mock>).mockResolvedValue(null);

      await expect(
        service.restoreVersion('resume-123', 'version-123', 'user-123'),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw ResourceNotFoundError when version belongs to different resume', async () => {
      (repository.findById as ReturnType<typeof mock>).mockResolvedValue({
        ...mockVersion,
        resumeId: 'other-resume',
      });

      await expect(
        service.restoreVersion('resume-123', 'version-123', 'user-123'),
      ).rejects.toThrow(ResourceNotFoundError);
    });

    it('should throw ResourceOwnershipError when user does not own resume', async () => {
      (repository.findResumeOwner as ReturnType<typeof mock>).mockResolvedValue(
        { userId: 'other-user' },
      );

      await expect(
        service.restoreVersion('resume-123', 'version-123', 'user-123'),
      ).rejects.toThrow(ResourceOwnershipError);
    });
  });

  describe('Version Cleanup (Max 30)', () => {
    it('should keep only last 30 versions', async () => {
      await service.createSnapshot('resume-123');

      expect(repository.deleteOldVersions).toHaveBeenCalledWith(
        'resume-123',
        30,
      );
    });

    it('should cleanup old versions after creating snapshot', async () => {
      await service.createSnapshot('resume-123');

      expect(repository.deleteOldVersions).toHaveBeenCalled();
    });
  });
});
