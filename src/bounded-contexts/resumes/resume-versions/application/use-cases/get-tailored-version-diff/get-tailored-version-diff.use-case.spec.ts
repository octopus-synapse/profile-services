import { beforeEach, describe, expect, it } from 'bun:test';
import {
  ResumeNotFoundException,
  ResumeNotOwnedException,
  ResumeVersionNotFoundException,
} from '@/bounded-contexts/resumes/domain/exceptions/resumes.exceptions';
import { InMemoryResumeVersionsRepository } from '../../../testing';
import { GetTailoredVersionDiffUseCase } from './get-tailored-version-diff.use-case';

describe('GetTailoredVersionDiffUseCase', () => {
  let useCase: GetTailoredVersionDiffUseCase;
  let repository: InMemoryResumeVersionsRepository;

  const resumeId = 'resume-1';
  const versionId = 'v-tailored';
  const userId = 'user-1';

  beforeEach(() => {
    repository = new InMemoryResumeVersionsRepository();
    useCase = new GetTailoredVersionDiffUseCase(repository);
  });

  it('throws ResumeNotFoundException when the resume does not exist', async () => {
    await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
      ResumeNotFoundException,
    );
  });

  it('throws ResumeNotOwnedException when the user is not the owner', async () => {
    repository.seedResume({ id: resumeId, userId: 'other-user', resumeSections: [] });

    await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
      ResumeNotOwnedException,
    );
  });

  it('throws ResumeVersionNotFoundException when the version belongs to a different resume', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: versionId,
      resumeId: 'other-resume',
      versionNumber: 1,
      snapshot: {},
      label: null,
      createdAt: new Date(),
      isTailored: true,
    });

    await expect(useCase.execute(resumeId, versionId, userId)).rejects.toThrow(
      ResumeVersionNotFoundException,
    );
  });

  it('returns before/after diff from the persisted snapshot envelope', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: versionId,
      resumeId,
      versionNumber: 1,
      snapshot: {
        master: {
          summary: 'old summary',
          jobTitle: 'old title',
          bullets: [{ id: 'b-1', content: 'old bullet' }],
        },
        tailored: {
          summary: 'new summary',
          jobTitle: 'new title',
          bullets: [
            { id: 'b-1', original: 'old bullet', tailored: 'new bullet', highlights: ['kw'] },
          ],
        },
      },
      label: null,
      createdAt: new Date(),
      isTailored: true,
    });

    const diff = await useCase.execute(resumeId, versionId, userId);

    expect(diff.versionId).toBe(versionId);
    expect(diff.summary).toEqual({ before: 'old summary', after: 'new summary' });
    expect(diff.jobTitle).toEqual({ before: 'old title', after: 'new title' });
    expect(diff.bullets).toEqual([
      { id: 'b-1', before: 'old bullet', after: 'new bullet', highlights: ['kw'] },
    ]);
  });

  it('returns null summary/jobTitle when the LLM left them unchanged', async () => {
    repository.seedResume({ id: resumeId, userId, resumeSections: [] });
    repository.seedVersion({
      id: versionId,
      resumeId,
      versionNumber: 1,
      snapshot: {
        master: { summary: 'm', jobTitle: 'm', bullets: [] },
        tailored: { summary: null, jobTitle: null, bullets: [] },
      },
      label: null,
      createdAt: new Date(),
      isTailored: true,
    });

    const diff = await useCase.execute(resumeId, versionId, userId);

    expect(diff.summary).toBeNull();
    expect(diff.jobTitle).toBeNull();
    expect(diff.bullets).toEqual([]);
  });
});
