import { describe, expect, it } from 'bun:test';
import { InMemoryJobsRepository } from '../../../testing';
import { ListBookmarkedJobsUseCase } from './list-bookmarked-jobs.use-case';

describe('ListBookmarkedJobsUseCase', () => {
  it('lists bookmarked jobs with bookmarkedAt denormalised', async () => {
    const repo = new InMemoryJobsRepository();
    repo.seedUser({ id: 'recruiter' });
    const job = repo.seedJob({ authorId: 'recruiter', title: 'A' });
    const bm = repo.seedBookmark(job.id, 'me');

    const out = await new ListBookmarkedJobsUseCase(repo).execute('me', 1, 20);
    expect(out.total).toBe(1);
    expect((out.items[0] as { id: string }).id).toBe(job.id);
    expect((out.items[0] as { bookmarkedAt: Date }).bookmarkedAt).toEqual(bm.createdAt);
  });
});
