import { describe, expect, it } from 'bun:test';
import { PostNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { InMemoryEngagementRepository } from '../../../testing';
import { BookmarkPostUseCase } from './bookmark-post.use-case';

describe('BookmarkPostUseCase', () => {
  it('creates a bookmark and increments count', async () => {
    const repo = new InMemoryEngagementRepository();
    repo.seedPost({ id: 'p1', authorId: 'a' });
    const out = await new BookmarkPostUseCase(repo).execute('p1', 'me');
    expect(out.alreadyBookmarked).toBe(false);
    expect(repo.findRawPost('p1')?.bookmarksCount).toBe(1);
  });

  it('is idempotent', async () => {
    const repo = new InMemoryEngagementRepository();
    repo.seedPost({ id: 'p1', authorId: 'a' });
    repo.seedBookmark('p1', 'me');
    const out = await new BookmarkPostUseCase(repo).execute('p1', 'me');
    expect(out.alreadyBookmarked).toBe(true);
  });

  it('throws when post does not exist', async () => {
    const repo = new InMemoryEngagementRepository();
    await expect(new BookmarkPostUseCase(repo).execute('missing', 'me')).rejects.toThrow(
      PostNotFoundException,
    );
  });
});
