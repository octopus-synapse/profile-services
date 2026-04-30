import { describe, expect, it } from 'bun:test';
import { InMemoryJobsRepository } from '../../../testing';
import { ListMyJobsUseCase } from './list-my-jobs.use-case';

describe('ListMyJobsUseCase', () => {
  it('returns only the caller-authored jobs', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedJob({ authorId: 'me', title: 'mine' });
    repo.seedJob({ authorId: 'other', title: 'theirs' });
    const out = await new ListMyJobsUseCase(repo).execute('me', 1, 20);
    expect(out.total).toBe(1);
    expect(out.items[0].title).toBe('mine');
  });
});
