import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ResumeNotFoundException,
  ResumeNotOwnedException,
  ResumeTailorInputRequiredException,
  TailorEngineUnavailableException,
} from '@/bounded-contexts/resumes/domain/exceptions/resumes.exceptions';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryResumeVersionsRepository, StubResumeTailorLlm } from '../../../testing';
import { TailorResumeForJobUseCase } from './tailor-resume-for-job.use-case';

describe('TailorResumeForJobUseCase', () => {
  let useCase: TailorResumeForJobUseCase;
  let repository: InMemoryResumeVersionsRepository;
  let llm: StubResumeTailorLlm;

  const resumeId = 'resume-1';
  const userId = 'user-1';

  beforeEach(() => {
    repository = new InMemoryResumeVersionsRepository();
    llm = new StubResumeTailorLlm(() => ({
      summary: 'tailored summary',
      jobTitle: 'Senior Engineer',
      bullets: [
        { id: 'item-1', original: 'shipped', tailored: 'shipped at scale', highlights: ['scale'] },
      ],
    }));
    useCase = new TailorResumeForJobUseCase(repository, llm, stubLogger);
  });

  it('throws ResumeNotFoundException when the resume does not exist', async () => {
    await expect(
      useCase.execute({ resumeId, userId, jobDescription: 'a long enough description' }),
    ).rejects.toThrow(ResumeNotFoundException);
  });

  it('throws ResumeNotOwnedException when the resume belongs to someone else', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId: 'other-user',
      summary: null,
      jobTitle: null,
      primaryStack: [],
      resumeSections: [],
    });

    await expect(
      useCase.execute({ resumeId, userId, jobDescription: 'a long enough description' }),
    ).rejects.toThrow(ResumeNotOwnedException);
  });

  it('throws ResumeTailorInputRequiredException without jobId or sufficient jobDescription', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      summary: null,
      jobTitle: null,
      primaryStack: [],
      resumeSections: [],
    });

    await expect(useCase.execute({ resumeId, userId })).rejects.toThrow(
      ResumeTailorInputRequiredException,
    );
    await expect(useCase.execute({ resumeId, userId, jobDescription: 'short' })).rejects.toThrow(
      ResumeTailorInputRequiredException,
    );
  });

  it('throws EntityNotFoundException when the supplied jobId does not exist', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      summary: null,
      jobTitle: null,
      primaryStack: [],
      resumeSections: [],
    });

    await expect(useCase.execute({ resumeId, userId, jobId: 'missing' })).rejects.toThrow(
      EntityNotFoundException,
    );
  });

  it('persists a tailored version and returns the LLM diff payload', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      summary: 'master summary',
      jobTitle: 'Engineer',
      primaryStack: ['ts'],
      resumeSections: [
        {
          sectionType: { key: 'experience', semanticKind: 'experience' },
          items: [{ id: 'item-1', content: { description: 'shipped' } }],
        },
      ],
    });
    repository.seedJob('job-1', {
      title: 'Senior Engineer',
      company: 'Acme',
      description: 'Build cool stuff',
      requirements: [],
      skills: [],
    });

    const result = await useCase.execute({ resumeId, userId, jobId: 'job-1' });

    expect(result.versionNumber).toBe(1);
    expect(result.summary).toBe('tailored summary');
    expect(result.bullets).toHaveLength(1);
    expect(result.label).toContain('Acme');

    const tailored = await repository.findTailoredVersions(resumeId);
    expect(tailored).toHaveLength(1);
    expect(tailored[0].tailoredJobId).toBe('job-1');
  });

  it('wraps LLM failures in TailorEngineUnavailableException', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      summary: null,
      jobTitle: null,
      primaryStack: [],
      resumeSections: [],
    });
    const failingLlm = new StubResumeTailorLlm(() => {
      throw new Error('rate limited');
    });
    const failingUseCase = new TailorResumeForJobUseCase(repository, failingLlm, stubLogger);

    await expect(
      failingUseCase.execute({
        resumeId,
        userId,
        jobDescription: 'this is a long enough job description for the use case',
      }),
    ).rejects.toBeInstanceOf(TailorEngineUnavailableException);
  });

  it('accepts a free-text job description with title/company defaults', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      summary: null,
      jobTitle: null,
      primaryStack: [],
      resumeSections: [],
    });

    const result = await useCase.execute({
      resumeId,
      userId,
      jobDescription: 'this is a long enough job description for the use case',
    });

    expect(result.label).toContain('Unknown company');
    expect(result.label).toContain('Target role');
  });
});
