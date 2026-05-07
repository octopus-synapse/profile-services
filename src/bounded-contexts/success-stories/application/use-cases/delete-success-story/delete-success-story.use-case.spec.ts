import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemorySuccessStoriesRepository } from '../../../testing';
import { DeleteSuccessStoryUseCase } from './delete-success-story.use-case';

describe('DeleteSuccessStoryUseCase', () => {
  it('removes the story', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    const created = await repo.create({
      userId: 'u-1',
      headline: 'h',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
    });

    await new DeleteSuccessStoryUseCase(repo).execute(created.id);
    expect(repo.rows).toHaveLength(0);
  });

  it('throws EntityNotFoundException when the id does not exist', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    await expect(new DeleteSuccessStoryUseCase(repo).execute('nope')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
