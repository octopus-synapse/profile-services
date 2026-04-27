import { stubLogger } from '@/shared-kernel/logger/testing';
import { describe, expect, it } from 'bun:test';
import { PostNotFoundException } from '../../../domain/exceptions/feed.exceptions';
import { InMemoryEngagementNotifier, InMemoryEngagementRepository } from '../../../testing';
import { LikePostUseCase } from './like-post.use-case';

function make() {
  const repo = new InMemoryEngagementRepository();
  const notifier = new InMemoryEngagementNotifier();
  return { repo, notifier, useCase: new LikePostUseCase(repo, notifier, stubLogger) };
}

describe('LikePostUseCase', () => {
  it('creates a like, bumps count, notifies author', async () => {
    const { repo, notifier, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'author' });
    const out = await useCase.execute('p1', 'liker', 'LIKE');
    expect(out.alreadyLiked).toBe(false);
    expect(repo.findRawPost('p1')?.likesCount).toBe(1);
    expect(notifier.events).toEqual([
      {
        recipientId: 'author',
        actorId: 'liker',
        postId: 'p1',
        type: 'POST_LIKED',
        message: 'reacted to your post',
      },
    ]);
  });

  it('returns alreadyLiked when same reaction exists', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'a' });
    repo.seedLike('p1', 'me', 'LIKE');
    const out = await useCase.execute('p1', 'me', 'LIKE');
    expect(out.alreadyLiked).toBe(true);
  });

  it('updates when reaction type changes', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'a' });
    repo.seedLike('p1', 'me', 'LIKE');
    const out = await useCase.execute('p1', 'me', 'CELEBRATE');
    expect(out.updated).toBe(true);
    expect(out.reactionType).toBe('CELEBRATE');
  });

  it('throws when post does not exist', async () => {
    const { useCase } = make();
    await expect(useCase.execute('missing', 'me')).rejects.toThrow(PostNotFoundException);
  });
});
