import { describe, expect, it, mock } from 'bun:test';
import type { LoggerPort } from '@/shared-kernel';
import {
  ResumeNotFoundException,
  ResumeSlotLimitReachedException,
  UnknownSectionTypeException,
} from '../../../../domain/exceptions';
import type { ResumeEntity } from '../../../ports/resumes-repository.port';
import { InMemoryResumesEventPublisher, InMemoryResumesRepository } from '../../../testing';
import { DuplicateResumeForUserUseCase } from './duplicate-resume-for-user.use-case';

const buildLogger = (): LoggerPort =>
  ({
    log: mock(),
    debug: mock(),
    warn: mock(),
    error: mock(),
    setContext: mock(),
  }) as unknown as LoggerPort;

/**
 * The Prisma-backed repository returns resumes with `resumeSections`
 * loaded; `ResumeEntity` doesn't type them. This stub mirrors that by
 * attaching sections to the source resume so include-key validation
 * can be exercised.
 */
class RepoWithSections extends InMemoryResumesRepository {
  sectionKeys: string[] = [];

  override async findResumeByIdAndUserId(id: string, userId: string): Promise<ResumeEntity | null> {
    const resume = await super.findResumeByIdAndUserId(id, userId);
    if (!resume) return null;
    return {
      ...resume,
      resumeSections: this.sectionKeys.map((key, i) => ({
        id: `section-${i}`,
        order: i,
        sectionType: { id: `type-${i}`, key },
        items: [],
      })),
    } as ResumeEntity;
  }
}

function setup(sectionKeys: string[] = ['work_experience_v1', 'education_v1']) {
  const repository = new RepoWithSections();
  repository.sectionKeys = sectionKeys;
  const eventPublisher = new InMemoryResumesEventPublisher();
  const useCase = new DuplicateResumeForUserUseCase(repository, eventPublisher, buildLogger());
  repository.seedResume({ id: 'master', userId: 'u1', title: 'Master' });
  return { repository, eventPublisher, useCase };
}

describe('DuplicateResumeForUserUseCase', () => {
  it('duplicates the resume with the new title and publishes resume_duplicated', async () => {
    const { repository, eventPublisher, useCase } = setup();

    const copy = await useCase.execute('u1', 'master', { title: 'Backend — fintech' });

    expect(copy.id).not.toBe('master');
    expect(copy.title).toBe('Backend — fintech');
    expect(repository.getAllResumes()).toHaveLength(2);
    const events = eventPublisher.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'resume_duplicated',
      resumeId: copy.id,
      payload: { userId: 'u1', sourceResumeId: 'master', newTitle: 'Backend — fintech' },
    });
  });

  it('sanitizes HTML out of the title', async () => {
    const { useCase } = setup();

    const copy = await useCase.execute('u1', 'master', {
      title: '<script>alert(1)</script>Backend',
    });

    expect(copy.title).not.toContain('<script>');
    expect(copy.title).toContain('Backend');
  });

  it('throws ResumeNotFoundException for a foreign or missing source', async () => {
    const { useCase } = setup();

    await expect(useCase.execute('u2', 'master', { title: 'X' })).rejects.toBeInstanceOf(
      ResumeNotFoundException,
    );
    await expect(useCase.execute('u1', 'missing', { title: 'X' })).rejects.toBeInstanceOf(
      ResumeNotFoundException,
    );
  });

  it('throws UnknownSectionTypeException for an include key not on the source', async () => {
    const { useCase } = setup(['work_experience_v1']);

    await expect(
      useCase.execute('u1', 'master', {
        title: 'X',
        include: [{ sectionTypeKey: 'projects_v1' }],
      }),
    ).rejects.toBeInstanceOf(UnknownSectionTypeException);
  });

  it('accepts include keys that exist on the source', async () => {
    const { useCase } = setup(['work_experience_v1', 'education_v1']);

    const copy = await useCase.execute('u1', 'master', {
      title: 'Subset',
      include: [{ sectionTypeKey: 'education_v1', itemIds: [] }],
    });

    expect(copy.title).toBe('Subset');
  });

  it('throws ResumeSlotLimitReachedException at the cap', async () => {
    const { repository, useCase } = setup();
    repository.seedResume({ id: 'r2', userId: 'u1', title: 'B' });
    repository.seedResume({ id: 'r3', userId: 'u1', title: 'C' });
    repository.seedResume({ id: 'r4', userId: 'u1', title: 'D' });

    await expect(useCase.execute('u1', 'master', { title: 'Fifth' })).rejects.toBeInstanceOf(
      ResumeSlotLimitReachedException,
    );
  });
});
