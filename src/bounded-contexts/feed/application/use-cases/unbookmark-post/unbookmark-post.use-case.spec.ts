import { describe, expect, it } from 'bun:test';
import { PostBookmarkNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { InMemoryEngagementRepository } from '../../../testing';
import { UnbookmarkPostUseCase } from './unbookmark-post.use-case';

describe('UnbookmarkPostUseCase', () => {
  it('removes the bookmark and decrements', async () => {
    const repo = new InMemoryEngagementRepository();
    repo.seedPost({ id: 'p1', authorId: 'a', bookmarksCount: 1 });
    repo.seedBookmark('p1', 'me');
    await new UnbookmarkPostUseCase(repo).execute('p1', 'me');
    expect(repo.findRawPost('p1')?.bookmarksCount).toBe(0);
  });

  it('throws when not bookmarked', async () => {
    const repo = new InMemoryEngagementRepository();
    await expect(new UnbookmarkPostUseCase(repo).execute('p1', 'me')).rejects.toThrow(
      PostBookmarkNotFoundException,
    );
  });
});
