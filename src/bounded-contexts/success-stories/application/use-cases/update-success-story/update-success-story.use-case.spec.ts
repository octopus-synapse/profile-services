import { describe, expect, it } from 'bun:test';
import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import { InMemorySuccessStoriesRepository } from '../../../testing';
import { UpdateSuccessStoryUseCase } from './update-success-story.use-case';

describe('UpdateSuccessStoryUseCase', () => {
  it('throws EntityNotFoundException for unknown ids', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    const useCase = new UpdateSuccessStoryUseCase(repo);

    await expect(useCase.execute('nope', { headline: 'x' })).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('stamps publishedAt on the draft → published transition', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    const created = await repo.create({
      userId: 'u-1',
      headline: 'h',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
      status: 'DRAFT',
    });

    const useCase = new UpdateSuccessStoryUseCase(repo);
    const result = await useCase.execute(created.id, { status: 'PUBLISHED' });

    expect(result.status).toBe('PUBLISHED');
    const row = repo.rows.find((r) => r.id === created.id);
    expect(row?.publishedAt).toBeInstanceOf(Date);
  });

  it('does not re-stamp publishedAt when story was already published', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    const created = await repo.create({
      userId: 'u-1',
      headline: 'h',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
      status: 'PUBLISHED',
    });
    const originalPublishedAt = repo.rows.find((r) => r.id === created.id)?.publishedAt;

    const useCase = new UpdateSuccessStoryUseCase(repo);
    await useCase.execute(created.id, { status: 'PUBLISHED', headline: 'updated' });

    const row = repo.rows.find((r) => r.id === created.id);
    expect(row?.publishedAt).toEqual(originalPublishedAt);
  });
});
