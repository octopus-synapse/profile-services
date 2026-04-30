import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemoryCommentRepository } from '../../../testing';
import { CreateCommentUseCase } from './create-comment.use-case';

function make() {
  const repo = new InMemoryCommentRepository();
  return { repo, useCase: new CreateCommentUseCase(repo) };
}

describe('CreateCommentUseCase', () => {
  it('creates a top-level comment', async () => {
    const { repo, useCase } = make();
    repo.seedPost('p1');
    const c = await useCase.execute('p1', 'me', 'hi');
    expect(c.postId).toBe('p1');
    expect(repo.commentsCountFor('p1')).toBe(1);
  });

  it('creates a reply when parentId provided', async () => {
    const { repo, useCase } = make();
    repo.seedPost('p1');
    const parent = await useCase.execute('p1', 'a', 'parent');
    const reply = await useCase.execute('p1', 'b', 'reply', parent.id);
    expect(reply.parentId).toBe(parent.id);
  });

  it('throws when post does not exist', async () => {
    const { useCase } = make();
    await expect(useCase.execute('missing', 'me', 'hi')).rejects.toThrow(EntityNotFoundException);
  });

  it('throws when parent comment does not exist', async () => {
    const { repo, useCase } = make();
    repo.seedPost('p1');
    await expect(useCase.execute('p1', 'me', 'hi', 'no-parent')).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
