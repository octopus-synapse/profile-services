import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ResumeNotFoundException,
  ResumeNotOwnedException,
} from '@/bounded-contexts/resumes/domain/exceptions/resumes.exceptions';
import { InMemoryResumeVersionsRepository } from '../../../testing';
import { GetTailoredVersionsUseCase } from './get-tailored-versions.use-case';

describe('GetTailoredVersionsUseCase', () => {
  let useCase: GetTailoredVersionsUseCase;
  let repository: InMemoryResumeVersionsRepository;

  const resumeId = 'resume-1';
  const userId = 'user-1';

  beforeEach(() => {
    repository = new InMemoryResumeVersionsRepository();
    useCase = new GetTailoredVersionsUseCase(repository);
  });

  it('throws ResumeNotFoundException when the resume does not exist', async () => {
    await expect(useCase.execute(resumeId, userId)).rejects.toThrow(ResumeNotFoundException);
  });

  it('throws ResumeNotOwnedException when the resume belongs to someone else', async () => {
    repository.seedResume({ id: resumeId, userId: 'other-user', resumeSections: [] });

    await expect(useCase.execute(resumeId, userId)).rejects.toThrow(ResumeNotOwnedException);
  });

  it('returns only versions flagged as tailored, sorted desc by createdAt', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: 'v-master',
      resumeId,
      versionNumber: 1,
      snapshot: {},
      label: 'master',
      createdAt: new Date('2024-01-01'),
      isTailored: false,
    });
    repository.seedVersion({
      id: 'v-tailored-old',
      resumeId,
      versionNumber: 2,
      snapshot: {},
      label: 'tailored old',
      createdAt: new Date('2024-01-02'),
      isTailored: true,
      tailoredJobId: 'job-1',
    });
    repository.seedVersion({
      id: 'v-tailored-new',
      resumeId,
      versionNumber: 3,
      snapshot: {},
      label: 'tailored new',
      createdAt: new Date('2024-02-01'),
      isTailored: true,
      tailoredJobId: 'job-2',
    });

    const result = await useCase.execute(resumeId, userId);

    expect(result.map((r) => r.id)).toEqual(['v-tailored-new', 'v-tailored-old']);
  });
});
