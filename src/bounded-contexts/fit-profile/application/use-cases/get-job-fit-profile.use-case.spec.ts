import { describe, expect, it } from 'bun:test';
import {
  JobFitProfileRepositoryPort,
  type JobFitProfileWrite,
  type SavedJobFitProfile,
} from '../../domain/ports/job-fit-profile.repository.port';
import { GetJobFitProfileUseCase } from './get-job-fit-profile.use-case';

class StubRepo extends JobFitProfileRepositoryPort {
  constructor(private readonly row: SavedJobFitProfile | null) {
    super();
  }
  async findByJobId(jobId: string) {
    return this.row && this.row.jobId === jobId ? this.row : null;
  }
  async upsert(_input: JobFitProfileWrite): Promise<SavedJobFitProfile> {
    throw new Error('not used');
  }
}

describe('GetJobFitProfileUseCase', () => {
  it('returns null when the job has no profile yet', async () => {
    const useCase = new GetJobFitProfileUseCase(new StubRepo(null));
    expect(await useCase.execute('job-1')).toBeNull();
  });

  it('returns the saved profile when present', async () => {
    const saved: SavedJobFitProfile = {
      id: 'j-1',
      jobId: 'job-1',
      vector: { bigFive: { BIG_FIVE_OPENNESS: 0.5 }, schwartz: {}, sdt: {} },
      editedByUserId: 'rec-1',
      computedAt: new Date(),
    };
    const useCase = new GetJobFitProfileUseCase(new StubRepo(saved));
    expect(await useCase.execute('job-1')).toBe(saved);
  });
});
