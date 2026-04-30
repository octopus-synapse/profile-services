import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ResumeAccessDeniedException,
  ResumeNotFoundException,
} from '@/bounded-contexts/resumes/domain/exceptions/resumes.exceptions';
import { InMemoryResumeVersionsRepository } from '../../../testing';
import { GetVersionsUseCase } from './get-versions.use-case';

describe('GetVersionsUseCase', () => {
  let useCase: GetVersionsUseCase;
  let repository: InMemoryResumeVersionsRepository;

  const resumeId = 'resume-123';
  const userId = 'user-789';

  beforeEach(() => {
    repository = new InMemoryResumeVersionsRepository();
    useCase = new GetVersionsUseCase(repository);
  });

  it('throws ResumeNotFoundException when resume not found', async () => {
    await expect(useCase.execute(resumeId, userId)).rejects.toThrow(ResumeNotFoundException);
  });

  it('throws ResumeAccessDeniedException when user is not the owner', async () => {
    repository.seedResume({ id: resumeId, userId: 'other-user', resumeSections: [] });

    await expect(useCase.execute(resumeId, userId)).rejects.toThrow(ResumeAccessDeniedException);
  });

  it('returns versions sorted desc when user owns the resume', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: 'v-1',
      resumeId,
      versionNumber: 1,
      snapshot: {},
      label: 'Version 1',
      createdAt: new Date('2024-01-01'),
    });
    repository.seedVersion({
      id: 'v-2',
      resumeId,
      versionNumber: 2,
      snapshot: {},
      label: 'Version 2',
      createdAt: new Date('2024-01-02'),
    });

    const result = await useCase.execute(resumeId, userId);

    expect(result).toHaveLength(2);
    expect(result[0].versionNumber).toBe(2);
    expect(result[1].versionNumber).toBe(1);
  });

  it('returns an empty array when no versions exist', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });

    const result = await useCase.execute(resumeId, userId);

    expect(result).toEqual([]);
  });
});
