import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
  ResumeVersionNotFoundException,
} from '@/bounded-contexts/resumes/domain/exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryResumeEventPublisher, InMemoryResumeVersionsRepository } from '../../../testing';
import { CreateSnapshotUseCase } from '../create-snapshot/create-snapshot.use-case';
import { RestoreVersionUseCase } from './restore-version.use-case';

describe('RestoreVersionUseCase', () => {
  let useCase: RestoreVersionUseCase;
  let createSnapshotUseCase: CreateSnapshotUseCase;
  let repository: InMemoryResumeVersionsRepository;
  let eventPublisher: InMemoryResumeEventPublisher;

  const resumeId = 'resume-123';
  const versionId = 'version-456';
  const userId = 'user-789';

  beforeEach(() => {
    repository = new InMemoryResumeVersionsRepository();
    eventPublisher = new InMemoryResumeEventPublisher();
    createSnapshotUseCase = new CreateSnapshotUseCase(repository, eventPublisher, stubLogger);
    useCase = new RestoreVersionUseCase(
      repository,
      createSnapshotUseCase,
      eventPublisher,
      stubLogger,
    );
  });

  it('throws ResumeNotFoundException when resume not found', async () => {
    await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
      ResumeNotFoundException,
    );
  });

  it('throws ResumeAccessDeniedException when user is not the owner', async () => {
    repository.seedResume({ id: resumeId, userId: 'other-user', resumeSections: [] });

    await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
      ResumeAccessDeniedException,
    );
  });

  it('throws ResumeVersionNotFoundException when version not found', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });

    await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
      ResumeVersionNotFoundException,
    );
  });

  it('throws ResumeVersionNotFoundException when version belongs to a different resume', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
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

  it('snapshots the current state before restoring', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: versionId,
      resumeId,
      versionNumber: 1,
      snapshot: { resume: { title: 'Old Title' }, sections: [] },
      label: null,
      createdAt: new Date('2024-01-01'),
    });

    await useCase.execute(resumeId, versionId, userId);

    const versions = await repository.findResumeVersions(resumeId);
    expect(versions.length).toBeGreaterThan(1);
  });

  it('returns the restoredFrom date of the version', async () => {
    const createdAt = new Date('2024-01-01');
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: versionId,
      resumeId,
      versionNumber: 1,
      snapshot: { resume: { title: 'Restored Title' }, sections: [] },
      label: null,
      createdAt,
    });

    const result = await useCase.execute(resumeId, versionId, userId);

    expect(result.restoredFrom).toEqual(createdAt);
  });
});
