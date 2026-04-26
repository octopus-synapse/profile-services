import { beforeEach, describe, expect, it } from 'bun:test';
import type { EventPublisher } from '@/shared-kernel';

const stubEventPublisher: EventPublisher = {
  publish: () => {},
  publishAsync: () => Promise.resolve(),
} as unknown as EventPublisher;

import {
  JobFitProfileRepositoryPort,
  type JobFitProfileWrite,
  type SavedJobFitProfile,
} from '../../domain/ports/job-fit-profile.repository.port';
import {
  InvalidJobFitSliderError,
  UpsertJobFitProfileUseCase,
} from './upsert-job-fit-profile.use-case';

class InMemoryJobProfiles extends JobFitProfileRepositoryPort {
  public rows: SavedJobFitProfile[] = [];
  async findByJobId(jobId: string) {
    return this.rows.find((r) => r.jobId === jobId) ?? null;
  }
  async upsert(input: JobFitProfileWrite) {
    const existing = this.rows.find((r) => r.jobId === input.jobId);
    const row: SavedJobFitProfile = {
      id: existing?.id ?? `j-${this.rows.length + 1}`,
      jobId: input.jobId,
      vector: input.vector,
      editedByUserId: input.editedByUserId,
      computedAt: new Date(),
    };
    if (existing) Object.assign(existing, row);
    else this.rows.push(row);
    return row;
  }
}

describe('UpsertJobFitProfileUseCase', () => {
  let repo: InMemoryJobProfiles;
  let useCase: UpsertJobFitProfileUseCase;

  beforeEach(() => {
    repo = new InMemoryJobProfiles();
    useCase = new UpsertJobFitProfileUseCase(repo, stubEventPublisher);
  });

  it('persists recruiter sliders projected into the three-block vector', async () => {
    const saved = await useCase.execute({
      jobId: 'job-1',
      editedByUserId: 'rec-1',
      sliders: { BIG_FIVE_OPENNESS: 0.9, SCHWARTZ_ACHIEVEMENT: 0.7, SDT_AUTONOMY: 0.5 },
    });
    expect(saved.vector.bigFive.BIG_FIVE_OPENNESS).toBe(0.9);
    expect(saved.vector.schwartz.SCHWARTZ_ACHIEVEMENT).toBe(0.7);
    expect(saved.vector.sdt.SDT_AUTONOMY).toBe(0.5);
    expect(saved.editedByUserId).toBe('rec-1');
  });

  it('upserts when called twice for the same job', async () => {
    await useCase.execute({
      jobId: 'job-1',
      editedByUserId: 'rec-1',
      sliders: { BIG_FIVE_OPENNESS: 0.9 },
    });
    const second = await useCase.execute({
      jobId: 'job-1',
      editedByUserId: 'rec-2',
      sliders: { BIG_FIVE_OPENNESS: 0.4 },
    });
    expect(repo.rows).toHaveLength(1);
    expect(second.vector.bigFive.BIG_FIVE_OPENNESS).toBe(0.4);
    expect(second.editedByUserId).toBe('rec-2');
  });

  it('rejects sliders outside [0,1]', async () => {
    await expect(
      useCase.execute({
        jobId: 'job-1',
        editedByUserId: 'rec-1',
        sliders: { BIG_FIVE_OPENNESS: 1.5 },
      }),
    ).rejects.toBeInstanceOf(InvalidJobFitSliderError);

    await expect(
      useCase.execute({
        jobId: 'job-1',
        editedByUserId: 'rec-1',
        sliders: { BIG_FIVE_OPENNESS: -0.1 },
      }),
    ).rejects.toBeInstanceOf(InvalidJobFitSliderError);
  });

  it('ignores unknown dimension keys silently', async () => {
    const saved = await useCase.execute({
      jobId: 'job-1',
      editedByUserId: 'rec-1',
      sliders: { NOT_A_DIMENSION: 0.5, BIG_FIVE_OPENNESS: 0.2 },
    });
    expect(saved.vector.bigFive.BIG_FIVE_OPENNESS).toBe(0.2);
    // Unknown keys shouldn't leak into any block.
    expect(Object.keys(saved.vector.bigFive)).toEqual(['BIG_FIVE_OPENNESS']);
  });
});
