/**
 * Unit tests for RestoreVersionUseCase
 *
 * Tests version restoration business logic:
 * - Authorization checks
 * - Snapshot creation before restore
 * - Version data restoration
 */
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions';
import { RestoreVersionUseCase } from './restore-version.use-case';
import type { ResumeVersionRepositoryPort } from '../ports/resume-version.port';
import type { CreateSnapshotUseCase } from './create-snapshot.use-case';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';

describe('RestoreVersionUseCase', () => {
  let useCase: RestoreVersionUseCase;
  let mockRepository: jest.Mocked<ResumeVersionRepositoryPort>;
  let mockCreateSnapshotUseCase: jest.Mocked<CreateSnapshotUseCase>;
  let mockEventPublisher: jest.Mocked<ResumeEventPublisher>;

  beforeEach(() => {
    mockRepository = {
      findResumeOwner: jest.fn(),
      findResumeVersionById: jest.fn(),
      updateResumeFromSnapshot: jest.fn(),
      findResumeById: jest.fn(),
    } as unknown as jest.Mocked<ResumeVersionRepositoryPort>;

    mockCreateSnapshotUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateSnapshotUseCase>;

    mockEventPublisher = {
      publishVersionRestored: jest.fn(),
      publish: jest.fn(),
    } as unknown as jest.Mocked<ResumeEventPublisher>;

    useCase = new RestoreVersionUseCase(
      mockRepository,
      mockCreateSnapshotUseCase,
      mockEventPublisher,
    );
  });

  describe('execute', () => {
    const resumeId = 'resume-123';
    const versionId = 'version-456';
    const userId = 'user-789';

    it('should throw EntityNotFoundException when resume not found', async () => {
      mockRepository.findResumeOwner.mockResolvedValue(null);

      await expect(
        useCase.execute(resumeId, versionId, userId),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockRepository.findResumeOwner.mockResolvedValue({
        id: resumeId,
        userId: 'other-user',
      });

      await expect(
        useCase.execute(resumeId, versionId, userId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw EntityNotFoundException when version not found', async () => {
      mockRepository.findResumeOwner.mockResolvedValue({
        id: resumeId,
        userId,
      });
      mockRepository.findResumeVersionById.mockResolvedValue(null);

      await expect(
        useCase.execute(resumeId, versionId, userId),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when version belongs to different resume', async () => {
      mockRepository.findResumeOwner.mockResolvedValue({
        id: resumeId,
        userId,
      });
      mockRepository.findResumeVersionById.mockResolvedValue({
        id: versionId,
        resumeId: 'different-resume',
        versionNumber: 1,
        createdAt: new Date(),
      });

      await expect(
        useCase.execute(resumeId, versionId, userId),
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should create snapshot before restoring version', async () => {
      const mockVersion = {
        id: versionId,
        resumeId,
        versionNumber: 1,
        createdAt: new Date(),
        snapshot: {
          resume: { title: 'Old Title' },
          sections: [],
        },
      };

      mockRepository.findResumeOwner.mockResolvedValue({
        id: resumeId,
        userId,
      });
      mockRepository.findResumeVersionById.mockResolvedValue(mockVersion);
      mockRepository.updateResumeFromSnapshot.mockResolvedValue(undefined);

      await useCase.execute(resumeId, versionId, userId);

      expect(mockCreateSnapshotUseCase.execute).toHaveBeenCalledWith(
        resumeId,
        'Before restore',
      );
    });

    it('should restore version and return result', async () => {
      const mockVersion = {
        id: versionId,
        resumeId,
        versionNumber: 1,
        createdAt: new Date(),
        snapshot: {
          resume: { title: 'Restored Title' },
          sections: [],
        },
      };

      mockRepository.findResumeOwner.mockResolvedValue({
        id: resumeId,
        userId,
      });
      mockRepository.findResumeVersionById.mockResolvedValue(mockVersion);
      mockRepository.updateResumeFromSnapshot.mockResolvedValue(undefined);

      const result = await useCase.execute(resumeId, versionId, userId);

      expect(result).toBeDefined();
      expect(mockRepository.updateResumeFromSnapshot).toHaveBeenCalled();
    });
  });
});
