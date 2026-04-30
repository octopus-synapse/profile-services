import { describe, expect, it } from 'bun:test';
import { InMemoryPollRepository } from '../../../testing';
import { GetPollResultsUseCase } from './get-poll-results.use-case';

describe('GetPollResultsUseCase', () => {
  it('returns aggregated buckets and total', async () => {
    const repo = new InMemoryPollRepository();
    repo.seedPost({ id: 'p1' });
    repo.seedVote('p1', 'a', 0);
    repo.seedVote('p1', 'b', 1);
    repo.seedVote('p1', 'c', 1);
    const out = await new GetPollResultsUseCase(repo).execute('p1');
    expect(out.totalVotes).toBe(3);
    expect(out.results.find((r) => r.optionIndex === 1)?.count).toBe(2);
  });
});
