import { stubLogger } from '@/shared-kernel/logger/testing';
import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryResumeVersionsRepository, StubResumeTailorLlm } from '../../testing';
import { GetTailoredVersionDiffUseCase } from '../use-cases/get-tailored-version-diff/get-tailored-version-diff.use-case';
import { GetTailoredVersionsUseCase } from '../use-cases/get-tailored-versions/get-tailored-versions.use-case';
import { TailorResumeForJobUseCase } from '../use-cases/tailor-resume-for-job/tailor-resume-for-job.use-case';
import { ResumeTailorService } from './resume-tailor.service';

describe('ResumeTailorService (facade)', () => {
  let service: ResumeTailorService;
  let repository: InMemoryResumeVersionsRepository;
  let llm: StubResumeTailorLlm;

  const resumeId = 'resume-1';
  const userId = 'user-1';

  beforeEach(() => {
    repository = new InMemoryResumeVersionsRepository();
    llm = new StubResumeTailorLlm(() => ({
      summary: 's',
      jobTitle: 'j',
      bullets: [],
    }));

    service = new ResumeTailorService(
      new TailorResumeForJobUseCase(repository, llm, stubLogger),
      new GetTailoredVersionsUseCase(repository),
      new GetTailoredVersionDiffUseCase(repository),
    );
  });

  it('tailors the resume and persists a version', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      summary: null,
      jobTitle: null,
      primaryStack: [],
      resumeSections: [],
    });
    repository.seedJob('job-1', {
      title: 'Eng',
      company: 'Acme',
      description: 'd',
      requirements: [],
      skills: [],
    });

    const result = await service.tailorForJob({ resumeId, userId, jobId: 'job-1' });

    expect(result.versionNumber).toBe(1);
  });

  it('lists tailored versions for the owner', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: 'v-1',
      resumeId,
      versionNumber: 1,
      snapshot: {},
      label: null,
      createdAt: new Date('2024-01-01'),
      isTailored: true,
      tailoredJobId: 'job-1',
    });

    const result = await service.getTailoredVersions(resumeId, userId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('v-1');
  });

  it('returns the diff for a tailored version', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: 'v-1',
      resumeId,
      versionNumber: 1,
      snapshot: {
        master: { summary: 'm', jobTitle: 'm', bullets: [] },
        tailored: { summary: 't', jobTitle: 't', bullets: [] },
      },
      label: null,
      createdAt: new Date(),
      isTailored: true,
    });

    const diff = await service.getDiff(resumeId, 'v-1', userId);

    expect(diff.versionId).toBe('v-1');
    expect(diff.summary).toEqual({ before: 'm', after: 't' });
  });
});
