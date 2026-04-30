import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryBadgesRepository } from '../../../testing';
import { HandleAtsScoreCalculatedUseCase } from './handle-ats-score-calculated.use-case';

describe('HandleAtsScoreCalculatedUseCase', () => {
  it('awards ATS_90_PLUS when score >= 90', async () => {
    const repo = new InMemoryBadgesRepository();
    await new HandleAtsScoreCalculatedUseCase(repo, stubLogger).execute('u-1', 92);
    expect(repo.rows).toHaveLength(1);
  });

  it('skips below the threshold', async () => {
    const repo = new InMemoryBadgesRepository();
    await new HandleAtsScoreCalculatedUseCase(repo, stubLogger).execute('u-1', 89);
    expect(repo.rows).toHaveLength(0);
  });
});
