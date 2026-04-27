import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { CannotDeleteOthersPostException } from '../../../domain/exceptions/feed.exceptions';
import { InMemoryFeedRepository } from '../../../testing';
import { DeletePostUseCase } from './delete-post.use-case';

function make() {
  const repo = new InMemoryFeedRepository();
  return { repo, useCase: new DeletePostUseCase(repo) };
}

describe('DeletePostUseCase', () => {
  it('soft deletes when caller is author', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'me' });
    await useCase.execute('p1', 'me');
    expect(repo.posts.get('p1')?.isDeleted).toBe(true);
  });

  it('throws Forbidden for non-authors', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'me' });
    await expect(useCase.execute('p1', 'other')).rejects.toThrow(CannotDeleteOthersPostException);
  });

  it('throws NotFound for missing post', async () => {
    const { useCase } = make();
    await expect(useCase.execute('missing', 'me')).rejects.toThrow(EntityNotFoundException);
  });
});
