import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryFeedRepository } from '../../../testing';
import { GetPostUseCase } from './get-post.use-case';

function make() {
  const repo = new InMemoryFeedRepository();
  const useCase = new GetPostUseCase(repo, stubLogger);
  return { repo, useCase };
}

describe('GetPostUseCase', () => {
  it('returns the post with author', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'a1' });
    const post = await useCase.execute('p1');
    expect(post.id).toBe('p1');
  });

  it('throws when not found', async () => {
    const { useCase } = make();
    await expect(useCase.execute('missing')).rejects.toThrow(EntityNotFoundException);
  });

  it('throws when soft-deleted', async () => {
    const { repo, useCase } = make();
    repo.seedPost({ id: 'p1', authorId: 'a1', isDeleted: true });
    await expect(useCase.execute('p1')).rejects.toThrow(EntityNotFoundException);
  });
});
