import { stubLogger } from '@/shared-kernel/logger/testing';
import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { NoPrimaryResumeException } from '../../../domain/exceptions/jobs.exceptions';
import {
  ResumeJobMatcherPort,
  type ResumeJobMatchResult,
} from '../../../domain/ports/resume-job-matcher.port';
import { InMemoryJobsRepository } from '../../../testing';
import { GetJobFitUseCase } from './get-job-fit.use-case';

class FakeMatcher extends ResumeJobMatcherPort {
  constructor(private readonly matched: string[]) {
    super();
  }
  async matchJobDescription(): Promise<ResumeJobMatchResult> {
    return {
      matchScore: 80,
      matchedKeywords: this.matched,
      missingKeywords: [],
      partialMatches: [],
      recommendations: [],
    };
  }
}
const fakeFacade = (m: string[]): FakeMatcher => new FakeMatcher(m);

describe('GetJobFitUseCase', () => {
  it('throws when the job is missing', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(
      new GetJobFitUseCase(repo, fakeFacade([]), stubLogger).execute('x', 'me'),
    ).rejects.toBeInstanceOf(EntityNotFoundException);
  });

  it('throws NoPrimaryResumeException when the user has no primary resume', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'me', primaryResumeId: null });
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    await expect(
      new GetJobFitUseCase(repo, fakeFacade([]), stubLogger).execute(job.id, 'me'),
    ).rejects.toBeInstanceOf(NoPrimaryResumeException);
  });

  it('attaches a hard/soft dimensional breakdown to the match result', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'me', primaryResumeId: 'resume-1' });
    const job = repo.seedJob({
      authorId: 'r',
      title: 'A',
      skills: ['typescript', 'postgres'],
      description: 'Strong communication and ownership required',
    });
    const out = (await new GetJobFitUseCase(
      repo,
      fakeFacade(['typescript', 'communication']),
      stubLogger,
    ).execute(job.id, 'me')) as { dimensions: { hardSkills: number; softSkills: number } };
    expect(out.dimensions.hardSkills).toBeGreaterThan(0);
    expect(out.dimensions.softSkills).toBeGreaterThan(0);
  });
});
