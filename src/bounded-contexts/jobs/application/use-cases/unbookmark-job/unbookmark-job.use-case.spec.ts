import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryJobsRepository } from '../../../testing';
import { UnbookmarkJobUseCase } from './unbookmark-job.use-case';

describe('UnbookmarkJobUseCase', () => {
  it('removes the bookmark and returns removed: true', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    repo.seedBookmark(job.id, 'me');
    const out = await new UnbookmarkJobUseCase(repo).execute(job.id, 'me');
    expect(out.removed).toBe(true);
    expect(repo.bookmarks.length).toBe(0);
  });

  it('is idempotent when job exists but no bookmark', async () => {
    const repo = new InMemoryJobsRepository();
    const job = repo.seedJob({ authorId: 'r', title: 'A' });
    const out = await new UnbookmarkJobUseCase(repo).execute(job.id, 'me');
    expect(out.removed).toBe(true);
  });

  it('throws EntityNotFoundException when job does not exist', async () => {
    const repo = new InMemoryJobsRepository();
    await expect(new UnbookmarkJobUseCase(repo).execute('nonexistent', 'me')).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
