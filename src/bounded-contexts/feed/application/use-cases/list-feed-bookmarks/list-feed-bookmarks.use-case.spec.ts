import { describe, expect, it } from 'bun:test';
import { InMemoryFeedRepository } from '../../../testing';
import { ListFeedBookmarksUseCase } from './list-feed-bookmarks.use-case';

function make() {
  const repo = new InMemoryFeedRepository();
  return { repo, useCase: new ListFeedBookmarksUseCase(repo) };
}

describe('ListFeedBookmarksUseCase', () => {
  it('returns bookmarked posts with isLiked decoration', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'a' });
    repo.seedBookmark('p1', 'viewer');
    repo.seedLike('p1', 'viewer');

    const out = await useCase.execute('viewer', undefined, 20);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].isLiked).toBe(true);
    expect(out.items[0].isBookmarked).toBe(true);
  });

  it('returns empty when no bookmarks', async () => {
    const { useCase } = make();
    const out = await useCase.execute('viewer', undefined, 20);
    expect(out.items).toEqual([]);
  });
});
