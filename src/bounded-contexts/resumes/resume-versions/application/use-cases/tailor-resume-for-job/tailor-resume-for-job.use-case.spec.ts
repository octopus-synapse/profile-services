import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ResumeNotFoundException,
  ResumeNotOwnedException,
  ResumeTailorInputRequiredException,
  TailorEngineUnavailableException,
} from '@/bounded-contexts/resumes/domain/exceptions';
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
      coverLetter: 'I built the tools this role needs and would welcome a conversation.',
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
    expect(result.coverLetter).toContain('I built the tools');
    expect(result.bullets).toHaveLength(1);
    expect(result.label).toContain('Acme');

    const tailored = await repository.findTailoredVersions(resumeId);
    expect(tailored).toHaveLength(1);
    expect(tailored[0].tailoredJobId).toBe('job-1');
    const saved = await repository.findResumeVersionById(result.versionId);
    expect(saved?.snapshot).toMatchObject({ tailored: { coverLetter: result.coverLetter } });
  });

  it('keeps the selected CV language in the response and saved version', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      language: 'pt-BR',
      summary: 'Resumo',
      jobTitle: 'Engenheira',
      primaryStack: [],
      resumeSections: [],
    });
    const result = await useCase.execute({
      resumeId,
      userId,
      jobDescription: 'Work with our team on this role and build services.',
      targetLocale: 'en',
    });
    expect(result.targetLocale).toBe('en');
    const saved = await repository.findResumeVersionById(result.versionId);
    expect(saved?.snapshot).toMatchObject({ targetLocale: 'en' });
  });

  it('prepares the other language before tailoring and sends localized text to the LLM', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      language: 'pt-BR',
      summary: 'Resumo',
      jobTitle: 'Engenheira',
      primaryStack: [],
      resumeSections: [],
    });
    const originalLoad = repository.findResumeForTailor.bind(repository);
    repository.findResumeForTailor = async (id, locale) => {
      const loaded = await originalLoad(id);
      return loaded && locale === 'en'
        ? { ...loaded, summary: 'Summary', jobTitle: 'Engineer' }
        : loaded;
    };
    const calls: string[] = [];
    const localizedLlm = new StubResumeTailorLlm((input) => {
      calls.push(`${input.sourceLocale}:${input.resume.summary}`);
      return { summary: 'Tailored summary', jobTitle: 'Engineer', coverLetter: null, bullets: [] };
    });
    const tailored = new TailorResumeForJobUseCase(
      repository,
      localizedLlm,
      stubLogger,
      null,
      null,
      async (_id, locale) => {
        calls.push(`translate:${locale}`);
      },
    );
    await tailored.execute({
      resumeId,
      userId,
      jobDescription: 'Work with our team in this role.',
      targetLocale: 'en',
    });
    expect(calls).toEqual(['translate:en', 'en:Summary']);
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

  it('reserves one preparation on success and releases it when tailoring fails', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      summary: null,
      jobTitle: null,
      primaryStack: [],
      resumeSections: [],
    });
    const calls: string[] = [];
    const reservation = { userId, periodStart: new Date('2026-09-01') };
    const meter = {
      reserve: async () => {
        calls.push('reserve');
        return reservation;
      },
      release: async () => {
        calls.push('release');
      },
    };
    const jobDescription = 'this is a long enough job description for the use case';
    const success = new TailorResumeForJobUseCase(repository, llm, stubLogger, null, meter);
    await success.execute({ resumeId, userId, jobDescription });
    expect(calls).toEqual(['reserve']);

    const failingLlm = new StubResumeTailorLlm(() => {
      throw new Error('provider outage');
    });
    const failing = new TailorResumeForJobUseCase(repository, failingLlm, stubLogger, null, meter);
    await expect(failing.execute({ resumeId, userId, jobDescription })).rejects.toBeInstanceOf(
      TailorEngineUnavailableException,
    );
    expect(calls).toEqual(['reserve', 'reserve', 'release']);
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
  it('passes personal motivation separately from the job and master resume', async () => {
    repository.seedTailorResume({
      id: resumeId,
      userId,
      summary: null,
      jobTitle: null,
      primaryStack: [],
      resumeSections: [],
    });
    const context = 'I enjoy building accessible products.';
    let received: unknown;
    const contextualLlm = new StubResumeTailorLlm((input) => {
      received = input;
      return { summary: null, jobTitle: null, coverLetter: 'Letter', bullets: [] };
    });
    const contextual = new TailorResumeForJobUseCase(repository, contextualLlm, stubLogger);
    await contextual.execute({
      resumeId,
      userId,
      jobDescription: 'Develop accessible interfaces.',
      candidateContext: context,
    });
    expect(received).toMatchObject({
      candidateContext: context,
      job: { description: 'Develop accessible interfaces.' },
    });
  });
});
