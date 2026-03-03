/**
 * Unit tests for GetVersionsUseCase
 *
 * Tests version listing business logic:
 * - Authorization checks
 * - Version retrieval
 */
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions';
import { GetVersionsUseCase } from './get-versions.use-case';
import type { ResumeVersionRepositoryPort } from '../ports/resume-version.port';

describe('GetVersionsUseCase', () => {
  let useCase: GetVersionsUseCase;
  let mockRepository: jest.Mocked<ResumeVersionRepositoryPort>;

  beforeEach(() => {
    mockRepository = {
      findResumeOwner: jest.fn(),
      findResumeVersions: jest.fn(),
    } as unknown as jest.Mocked<ResumeVersionRepositoryPort>;

    useCase = new GetVersionsUseCase(mockRepository);
  });

  describe('execute', () => {
    const resumeId = 'resume-123';
    const userId = 'user-789';

    it('should throw EntityNotFoundException when resume not found', async () => {
      mockRepository.findResumeOwner.mockResolvedValue(null);

      await expect(useCase.execute(resumeId, userId)).rejects.toThrow(
        EntityNotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockRepository.findResumeOwner.mockResolvedValue({
        id: resumeId,
        userId: 'other-user',
      });

      await expect(useCase.execute(resumeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return versions when user is owner', async () => {
      const expectedVersions = [
        {
          id: 'version-1',
          versionNumber: 1,
          title: 'Version 1',
          createdAt: new Date(),
        },
        {
          id: 'version-2',
          versionNumber: 2,
          title: 'Version 2',
          createdAt: new Date(),
        },
      ];

      mockRepository.findResumeOwner.mockResolvedValue({
        id: resumeId,
        userId,
      });
      mockRepository.findResumeVersions.mockResolvedValue(expectedVersions);

      const result = await useCase.execute(resumeId, userId);

      expect(mockRepository.findResumeVersions).toHaveBeenCalledWith(resumeId);
      expect(result).toEqual(expectedVersions);
    });

    it('should return empty array when no versions exist', async () => {
      mockRepository.findResumeOwner.mockResolvedValue({
        id: resumeId,
        userId,
      });
      mockRepository.findResumeVersions.mockResolvedValue([]);

      const result = await useCase.execute(resumeId, userId);

      expect(result).toEqual([]);
    });
  });
});
