import { describe, expect, it } from 'bun:test';
import { InMemoryCommentRepository } from '../../../testing';
import { ListPostCommentsUseCase } from './list-post-comments.use-case';

describe('ListPostCommentsUseCase', () => {
  it('returns top-level comments newest-first', async () => {
    const repo = new InMemoryCommentRepository();
    repo.seedPost('p1');
    repo.seedComment({ id: 'c1', postId: 'p1', authorId: 'a', content: 'first' });
    repo.seedComment({ id: 'c2', postId: 'p1', authorId: 'b', content: 'second' });
    const out = await new ListPostCommentsUseCase(repo).execute('p1', undefined, 20);
    expect(out.items.map((c) => c.id)).toEqual(['c2', 'c1']);
  });
});
