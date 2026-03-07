/**
 * Unit tests for GetVersionsUseCase
 *
 * Tests version listing business logic using in-memory implementations.
 * Pure tests - no mocks.
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException, ForbiddenException } from '@/shared-kernel/exceptions';
import { InMemoryResumeVersionRepository } from '../testing';
import { GetVersionsUseCase } from './get-versions.use-case';

describe('GetVersionsUseCase', () => {
  let useCase: GetVersionsUseCase;
  let repository: InMemoryResumeVersionRepository;

  const resumeId = 'resume-123';
  const userId = 'user-789';

  beforeEach(() => {
    repository = new InMemoryResumeVersionRepository();
    useCase = new GetVersionsUseCase(repository);
  });

  describe('execute', () => {
    it('should throw EntityNotFoundException when resume not found', async () => {
      await expect(useCase.execute(resumeId, userId)).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      repository.seedResume({
        id: resumeId,
        userId: 'other-user',
        resumeSections: [],
      });

      await expect(useCase.execute(resumeId, userId)).rejects.toThrow(ForbiddenException);
    });

    it('should return versions when user is owner', async () => {
      repository.seedResume({
        id: resumeId,
        userId,
        resumeSections: [],
      });
      repository.seedVersion({
        id: 'version-1',
        resumeId,
        versionNumber: 1,
        snapshot: {},
        label: 'Version 1',
        createdAt: new Date('2024-01-01'),
      });
      repository.seedVersion({
        id: 'version-2',
        resumeId,
        versionNumber: 2,
        snapshot: {},
        label: 'Version 2',
        createdAt: new Date('2024-01-02'),
      });

      const result = await useCase.execute(resumeId, userId);

      expect(result).toHaveLength(2);
      expect(result[0].versionNumber).toBe(2); // Sorted desc
      expect(result[1].versionNumber).toBe(1);
    });

    it('should return empty array when no versions exist', async () => {
      repository.seedResume({
        id: resumeId,
        userId,
        resumeSections: [],
      });

      const result = await useCase.execute(resumeId, userId);

      expect(result).toEqual([]);
    });
  });
});
