import { describe, expect, it } from 'bun:test';
import { InMemoryJobsRepository } from '../../testing';
import { FitScoreBatchService } from './fit-score-batch.service';

describe('FitScoreBatchService', () => {
  it('produces a fit score per supplied job using the user resume skills', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'me', skills: ['typescript', 'postgres'] });
    const service = new FitScoreBatchService(repo);

    const out = await service.scoreJobsForUser('me', [
      { id: 'a', skills: ['typescript', 'postgres'], minEnglishLevel: null, remotePolicy: null },
      { id: 'b', skills: ['rust'], minEnglishLevel: null, remotePolicy: null },
    ]);

    expect(out.size).toBe(2);
    const aScore = out.get('a')?.score ?? 0;
    const bScore = out.get('b')?.score ?? 0;
    expect(aScore).toBeGreaterThan(bScore);
  });

  it('returns an empty map when no jobs are passed in', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'me' });
    const out = await new FitScoreBatchService(repo).scoreJobsForUser('me', []);
    expect(out.size).toBe(0);
  });
});
