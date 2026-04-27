import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryResumeEventPublisher, InMemoryResumeVersionsRepository } from '../../testing';
import { CreateSnapshotUseCase } from '../use-cases/create-snapshot/create-snapshot.use-case';
import { GetVersionsUseCase } from '../use-cases/get-versions/get-versions.use-case';
import { RestoreVersionUseCase } from '../use-cases/restore-version/restore-version.use-case';
import { ResumeVersionService } from './resume-version.service';

describe('ResumeVersionService (facade)', () => {
  let service: ResumeVersionService;
  let repository: InMemoryResumeVersionsRepository;
  let eventPublisher: InMemoryResumeEventPublisher;

  const resumeId = 'resume-1';
  const userId = 'user-1';

  beforeEach(() => {
    repository = new InMemoryResumeVersionsRepository();
    eventPublisher = new InMemoryResumeEventPublisher();
    const createSnapshot = new CreateSnapshotUseCase(repository, eventPublisher);
    const getVersions = new GetVersionsUseCase(repository);
    const restoreVersion = new RestoreVersionUseCase(repository, createSnapshot, eventPublisher);
    service = new ResumeVersionService(createSnapshot, getVersions, restoreVersion);
  });

  it('creates a snapshot via the use case', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });

    await service.createSnapshot(resumeId, 'label');

    const versions = await repository.findResumeVersions(resumeId);
    expect(versions).toHaveLength(1);
    expect(versions[0].label).toBe('label');
  });

  it('lists versions for the owner', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: 'v-1',
      resumeId,
      versionNumber: 1,
      snapshot: {},
      label: null,
      createdAt: new Date(),
    });

    const result = await service.getVersions(resumeId, userId);

    expect(result).toHaveLength(1);
  });

  it('restores a previously persisted version', async () => {
    const createdAt = new Date('2024-01-01');
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: 'v-1',
      resumeId,
      versionNumber: 1,
      snapshot: { resume: { title: 'old' }, sections: [] },
      label: null,
      createdAt,
    });

    const result = await service.restoreVersion(resumeId, 'v-1', userId);

    expect(result.restoredFrom).toEqual(createdAt);
  });
});
