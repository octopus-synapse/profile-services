import { describe, expect, it } from 'bun:test';
import { InMemoryCommentRepository } from '../../../testing';
import { ListCommentRepliesUseCase } from './list-comment-replies.use-case';

describe('ListCommentRepliesUseCase', () => {
  it('returns replies for a comment', async () => {
    const repo = new InMemoryCommentRepository();
    repo.seedPost('p1');
    repo.seedComment({ id: 'parent', postId: 'p1', authorId: 'a' });
    repo.seedComment({ id: 'r1', postId: 'p1', authorId: 'b', parentId: 'parent' });
    const out = await new ListCommentRepliesUseCase(repo).execute('parent', undefined, 20);
    expect(out.replies.map((r) => r.id)).toEqual(['r1']);
  });
});
