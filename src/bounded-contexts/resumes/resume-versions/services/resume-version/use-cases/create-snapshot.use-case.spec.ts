/**
 * Unit tests for CreateSnapshotUseCase
 *
 * Tests snapshot creation business logic using in-memory implementations.
 * Pure tests - no mocks.
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions';
import { InMemoryResumeEventPublisher, InMemoryResumeVersionRepository } from '../testing';
import { CreateSnapshotUseCase } from './create-snapshot.use-case';

describe('CreateSnapshotUseCase', () => {
  let useCase: CreateSnapshotUseCase;
  let repository: InMemoryResumeVersionRepository;
  let eventPublisher: InMemoryResumeEventPublisher;

  const resumeId = 'resume-123';

  beforeEach(() => {
    repository = new InMemoryResumeVersionRepository();
    eventPublisher = new InMemoryResumeEventPublisher();
    useCase = new CreateSnapshotUseCase(repository, eventPublisher);
  });

  describe('execute', () => {
    it('should throw EntityNotFoundException when resume not found', async () => {
      await expect(useCase.execute(resumeId)).rejects.toThrow(EntityNotFoundException);
    });

    it('should create snapshot with incremented version number', async () => {
      repository.seedResume({
        id: resumeId,
        userId: 'user-1',
        resumeSections: [],
      });
      repository.seedVersion({
        id: 'v-1',
        resumeId,
        versionNumber: 1,
        snapshot: {},
        label: null,
        createdAt: new Date(),
      });
      repository.seedVersion({
        id: 'v-2',
        resumeId,
        versionNumber: 2,
        snapshot: {},
        label: null,
        createdAt: new Date(),
      });

      const result = await useCase.execute(resumeId);

      expect(result.versionNumber).toBe(3);
      expect(result.resumeId).toBe(resumeId);
    });

    it('should start at version 1 when no previous versions exist', async () => {
      repository.seedResume({
        id: resumeId,
        userId: 'user-1',
        resumeSections: [],
      });

      const result = await useCase.execute(resumeId);

      expect(result.versionNumber).toBe(1);
    });

    it('should include label when provided', async () => {
      repository.seedResume({
        id: resumeId,
        userId: 'user-1',
        resumeSections: [],
      });

      const result = await useCase.execute(resumeId, 'Before major update');

      expect(result.label).toBe('Before major update');
    });

    it('should publish version created event', async () => {
      repository.seedResume({
        id: resumeId,
        userId: 'user-1',
        resumeSections: [],
      });

      await useCase.execute(resumeId);

      const events = eventPublisher.getVersionCreatedEvents();
      expect(events).toHaveLength(1);
      expect(events[0].resumeId).toBe(resumeId);
      expect(events[0].userId).toBe('user-1');
    });

    it('should cleanup old versions when exceeding MAX_VERSIONS', async () => {
      repository.seedResume({
        id: resumeId,
        userId: 'user-1',
        resumeSections: [],
      });

      // Seed 35 versions (exceeds MAX_VERSIONS of 30)
      for (let i = 1; i <= 35; i++) {
        repository.seedVersion({
          id: `v-${i}`,
          resumeId,
          versionNumber: i,
          snapshot: {},
          label: null,
          createdAt: new Date(Date.now() - (35 - i) * 1000),
        });
      }

      await useCase.execute(resumeId);

      // Should have MAX_VERSIONS (30) + 1 new version = 31, cleanup removes 5
      const versions = await repository.findResumeVersions(resumeId);
      expect(versions.length).toBeLessThanOrEqual(31);
    });
  });
});
