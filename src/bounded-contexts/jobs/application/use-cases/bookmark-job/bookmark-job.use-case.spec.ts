import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { BookmarkJobUseCase } from './bookmark-job.use-case';

describe('BookmarkJobUseCase', () => {
  it('throws when the job is missing', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(new BookmarkJobUseCase(repo).execute('x', 'me')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('is idempotent', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    const useCase = new BookmarkJobUseCase(repo);
    const first = await useCase.execute(job.id, 'me');
    const second = await useCase.execute(job.id, 'me');
    expect(first.alreadyBookmarked).toBe(false);
    expect(second.alreadyBookmarked).toBe(true);
  });
});
