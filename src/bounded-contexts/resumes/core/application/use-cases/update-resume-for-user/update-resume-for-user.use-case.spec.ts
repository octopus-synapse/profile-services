import { beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { buildResume } from '@test/shared/factories/resume.factory';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryResumesEventPublisher,
  InMemoryResumesRepository,
  StubResumeVersionService,
} from '../../../testing';
import { UpdateResumeForUserUseCase } from './update-resume-for-user.use-case';

describe('UpdateResumeForUserUseCase', () => {
  const userId = 'user-123';
  let repository: InMemoryResumesRepository;
  let versionService: StubResumeVersionService;
  let eventPublisher: InMemoryResumesEventPublisher;
  let useCase: UpdateResumeForUserUseCase;

  beforeEach(() => {
    repository = new InMemoryResumesRepository();
    versionService = new StubResumeVersionService();
    eventPublisher = new InMemoryResumesEventPublisher();
    useCase = new UpdateResumeForUserUseCase(
      repository,
      versionService,
      eventPublisher,
      stubLogger,
    );
    repository.seedResume(
      buildResume({
        id: 'resume-1',
        userId,
        title: 'Software Engineer',
        summary: 'Experienced developer',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it('updates a resume the user owns and emits ResumeUpdated once', async () => {
    const published = spyOn(eventPublisher, 'publishResumeUpdated');

    const result = await useCase.execute('resume-1', userId, { title: 'Updated Title' });

    expect(result.title).toBe('Updated Title');
    expect(published).toHaveBeenCalledTimes(1);
    expect(published).toHaveBeenCalledWith('resume-1', {
      userId,
      changedFields: ['title'],
    });
  });

  it('throws EntityNotFoundException when the resume is not owned by the user', async () => {
    await expect(
      useCase.execute('resume-1', 'someone-else', { title: 'Updated Title' }),
    ).rejects.toThrow(EntityNotFoundException);
  });
});
