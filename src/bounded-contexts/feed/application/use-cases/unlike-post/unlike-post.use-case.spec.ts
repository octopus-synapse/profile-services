import { describe, expect, it } from 'bun:test';
import { PostLikeNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { InMemoryEngagementRepository } from '../../../testing';
import { UnlikePostUseCase } from './unlike-post.use-case';

describe('UnlikePostUseCase', () => {
  it('removes a like and decrements count', async () => {
    const repo = new InMemoryEngagementRepository();
    repo.seedPost({ id: 'p1', authorId: 'a', likesCount: 1 });
    repo.seedLike('p1', 'me', 'LIKE');
    await new UnlikePostUseCase(repo).execute('p1', 'me');
    expect(repo.findRawPost('p1')?.likesCount).toBe(0);
    expect(repo.findRawLike('p1', 'me')).toBeNull();
  });

  it('throws when no existing like', async () => {
    const repo = new InMemoryEngagementRepository();
    repo.seedPost({ id: 'p1', authorId: 'a' });
    await expect(new UnlikePostUseCase(repo).execute('p1', 'me')).rejects.toThrow(
      PostLikeNotFoundException,
    );
  });
});
