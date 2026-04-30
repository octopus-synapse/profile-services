import { describe, expect, it } from 'bun:test';
import { InMemoryCommentRepository } from '../../../testing';
import { ListUserCommentsUseCase } from './list-user-comments.use-case';

describe('ListUserCommentsUseCase', () => {
  it('returns comments authored by the user with post snippet', async () => {
    const repo = new InMemoryCommentRepository();
    repo.seedPost('p1', { type: 'TEXT', content: 'orig', authorId: 'someone' });
    repo.seedComment({ id: 'c1', postId: 'p1', authorId: 'me', content: 'reply' });
    const out = await new ListUserCommentsUseCase(repo).execute('me', undefined, 20);
    expect(out.comments).toHaveLength(1);
    expect(out.comments[0].post.id).toBe('p1');
  });

  it('caps limit at 50', async () => {
    const repo = new InMemoryCommentRepository();
    repo.seedPost('p1');
    for (let i = 0; i < 60; i++) {
      repo.seedComment({ id: `c${i}`, postId: 'p1', authorId: 'me' });
    }
    const out = await new ListUserCommentsUseCase(repo).execute('me', undefined, 100);
    expect(out.comments.length).toBe(50);
  });
});
