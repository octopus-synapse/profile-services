/**
 * Unit tests for RestoreVersionUseCase
 *
 * Tests version restoration business logic using in-memory implementations.
 * Pure tests - no mocks.
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
  ResumeVersionNotFoundException,
} from '../../../../domain/exceptions/resumes.exceptions';
import { InMemoryResumeEventPublisher, InMemoryResumeVersionRepository } from '../testing';
import { CreateSnapshotUseCase } from './create-snapshot.use-case';
import { RestoreVersionUseCase } from './restore-version.use-case';

describe('RestoreVersionUseCase', () => {
  let useCase: RestoreVersionUseCase;
  let createSnapshotUseCase: CreateSnapshotUseCase;
  let repository: InMemoryResumeVersionRepository;
  let eventPublisher: InMemoryResumeEventPublisher;

  const resumeId = 'resume-123';
  const versionId = 'version-456';
  const userId = 'user-789';

  beforeEach(() => {
    repository = new InMemoryResumeVersionRepository();
    eventPublisher = new InMemoryResumeEventPublisher();
    createSnapshotUseCase = new CreateSnapshotUseCase(repository, eventPublisher);
    useCase = new RestoreVersionUseCase(repository, createSnapshotUseCase, eventPublisher);
  });

  describe('execute', () => {
    it('should throw ResumeNotFoundException when resume not found', async () => {
      await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
        ResumeNotFoundException,
      );
    });

    it('should throw ResumeAccessDeniedException when user is not owner', async () => {
      repository.seedResume({
        id: resumeId,
        userId: 'other-user',
        resumeSections: [],
      });

      await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
        ResumeAccessDeniedException,
      );
    });

    it('should throw ResumeVersionNotFoundException when version not found', async () => {
      repository.seedResume({
        id: resumeId,
        userId,
        resumeSections: [],
      });

      await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
        ResumeVersionNotFoundException,
      );
    });

    it('should throw ResumeVersionNotFoundException when version belongs to different resume', async () => {
      repository.seedResume({
        id: resumeId,
        userId,
        resumeSections: [],
      });
      repository.seedVersion({
        id: versionId,
        resumeId: 'different-resume',
        versionNumber: 1,
        snapshot: {},
        label: null,
        createdAt: new Date(),
      });

      await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
        ResumeVersionNotFoundException,
      );
    });

    it('should create snapshot before restoring version', async () => {
      repository.seedResume({
        id: resumeId,
        userId,
        resumeSections: [],
      });
      repository.seedVersion({
        id: versionId,
        resumeId,
        versionNumber: 1,
        snapshot: {
          resume: { title: 'Old Title' },
          sections: [],
        },
        label: null,
        createdAt: new Date('2024-01-01'),
      });

      await useCase.execute(resumeId, versionId, userId);

      // Should have created a new version (snapshot before restore)
      const versions = await repository.findResumeVersions(resumeId);
      expect(versions.length).toBeGreaterThan(1);
    });

    it('should restore version and return result', async () => {
      const createdAt = new Date('2024-01-01');
      repository.seedResume({
        id: resumeId,
        userId,
        resumeSections: [],
      });
      repository.seedVersion({
        id: versionId,
        resumeId,
        versionNumber: 1,
        snapshot: {
          resume: { title: 'Restored Title' },
          sections: [],
        },
        label: null,
        createdAt,
      });

      const result = await useCase.execute(resumeId, versionId, userId);

      expect(result).toBeDefined();
      expect(result.restoredFrom).toEqual(createdAt);
    });
  });
});
