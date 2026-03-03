/**
 * Unit tests for CreateSnapshotUseCase
 *
 * Tests snapshot creation business logic:
 * - Resume validation
 * - Version number calculation
 * - Snapshot normalization
 * - Old version cleanup
 */
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { CreateSnapshotUseCase } from './create-snapshot.use-case';
import type { ResumeVersionRepositoryPort } from '../ports/resume-version.port';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';

describe('CreateSnapshotUseCase', () => {
  let useCase: CreateSnapshotUseCase;
  let mockRepository: jest.Mocked<ResumeVersionRepositoryPort>;
  let mockEventPublisher: jest.Mocked<ResumeEventPublisher>;

  beforeEach(() => {
    mockRepository = {
      findResumeForSnapshot: jest.fn(),
      findLastVersionNumber: jest.fn(),
      createResumeVersion: jest.fn(),
      findVersionIdsByResumeIdDesc: jest.fn(),
      deleteVersionsByIds: jest.fn(),
    } as unknown as jest.Mocked<ResumeVersionRepositoryPort>;

    mockEventPublisher = {
      publishVersionCreated: jest.fn(),
      publish: jest.fn(),
    } as unknown as jest.Mocked<ResumeEventPublisher>;

    useCase = new CreateSnapshotUseCase(mockRepository, mockEventPublisher);
  });

  describe('execute', () => {
    const resumeId = 'resume-123';

    it('should throw EntityNotFoundException when resume not found', async () => {
      mockRepository.findResumeForSnapshot.mockResolvedValue(null);

      await expect(useCase.execute(resumeId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should create snapshot with incremented version number', async () => {
      const mockResume = {
        id: resumeId,
        userId: 'user-1',
        title: 'My Resume',
        createdAt: new Date(),
        updatedAt: new Date(),
        resumeSections: [],
      };
      const expectedVersion = {
        id: 'version-1',
        resumeId,
        versionNumber: 3,
        createdAt: new Date(),
      };

      mockRepository.findResumeForSnapshot.mockResolvedValue(mockResume);
      mockRepository.findLastVersionNumber.mockResolvedValue(2);
      mockRepository.createResumeVersion.mockResolvedValue(expectedVersion);
      mockRepository.findVersionIdsByResumeIdDesc.mockResolvedValue([]);

      const result = await useCase.execute(resumeId);

      expect(mockRepository.createResumeVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeId,
          versionNumber: 3,
        }),
      );
      expect(result).toEqual(expectedVersion);
    });

    it('should start at version 1 when no previous versions exist', async () => {
      const mockResume = {
        id: resumeId,
        userId: 'user-1',
        title: 'My Resume',
        createdAt: new Date(),
        updatedAt: new Date(),
        resumeSections: [],
      };

      mockRepository.findResumeForSnapshot.mockResolvedValue(mockResume);
      mockRepository.findLastVersionNumber.mockResolvedValue(null);
      mockRepository.createResumeVersion.mockResolvedValue({
        id: 'version-1',
        resumeId,
        versionNumber: 1,
        createdAt: new Date(),
      });
      mockRepository.findVersionIdsByResumeIdDesc.mockResolvedValue([]);

      await useCase.execute(resumeId);

      expect(mockRepository.createResumeVersion).toHaveBeenCalledWith(
        expect.objectContaining({ versionNumber: 1 }),
      );
    });

    it('should include label when provided', async () => {
      const mockResume = {
        id: resumeId,
        userId: 'user-1',
        title: 'My Resume',
        createdAt: new Date(),
        updatedAt: new Date(),
        resumeSections: [],
      };

      mockRepository.findResumeForSnapshot.mockResolvedValue(mockResume);
      mockRepository.findLastVersionNumber.mockResolvedValue(0);
      mockRepository.createResumeVersion.mockResolvedValue({
        id: 'version-1',
        resumeId,
        versionNumber: 1,
        createdAt: new Date(),
      });
      mockRepository.findVersionIdsByResumeIdDesc.mockResolvedValue([]);

      await useCase.execute(resumeId, 'Before major update');

      expect(mockRepository.createResumeVersion).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Before major update' }),
      );
    });

    it('should publish version created event', async () => {
      const mockResume = {
        id: resumeId,
        userId: 'user-1',
        title: 'My Resume',
        createdAt: new Date(),
        updatedAt: new Date(),
        resumeSections: [],
      };

      mockRepository.findResumeForSnapshot.mockResolvedValue(mockResume);
      mockRepository.findLastVersionNumber.mockResolvedValue(0);
      mockRepository.createResumeVersion.mockResolvedValue({
        id: 'version-1',
        resumeId,
        versionNumber: 1,
        createdAt: new Date(),
      });
      mockRepository.findVersionIdsByResumeIdDesc.mockResolvedValue([]);

      await useCase.execute(resumeId);

      expect(mockEventPublisher.publishVersionCreated).toHaveBeenCalledWith(
        resumeId,
        expect.objectContaining({
          userId: 'user-1',
          versionNumber: 1,
        }),
      );
    });

    it('should cleanup old versions when exceeding MAX_VERSIONS', async () => {
      const mockResume = {
        id: resumeId,
        userId: 'user-1',
        title: 'My Resume',
        createdAt: new Date(),
        updatedAt: new Date(),
        resumeSections: [],
      };
      const manyVersionIds = Array.from({ length: 35 }, (_, i) => `v-${i}`);

      mockRepository.findResumeForSnapshot.mockResolvedValue(mockResume);
      mockRepository.findLastVersionNumber.mockResolvedValue(34);
      mockRepository.createResumeVersion.mockResolvedValue({
        id: 'version-35',
        resumeId,
        versionNumber: 35,
        createdAt: new Date(),
      });
      mockRepository.findVersionIdsByResumeIdDesc.mockResolvedValue(
        manyVersionIds,
      );

      await useCase.execute(resumeId);

      expect(mockRepository.deleteVersionsByIds).toHaveBeenCalledWith(
        manyVersionIds.slice(30),
      );
    });
  });
});
