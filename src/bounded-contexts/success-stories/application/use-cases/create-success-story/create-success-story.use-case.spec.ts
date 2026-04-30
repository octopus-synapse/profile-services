import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemorySuccessStoriesRepository } from '../../../testing';
import { CreateSuccessStoryUseCase } from './create-success-story.use-case';

describe('CreateSuccessStoryUseCase', () => {
  it('persists a draft story', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    const useCase = new CreateSuccessStoryUseCase(repo, stubLogger);

    const result = await useCase.execute({
      userId: 'u-1',
      headline: 'h',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
    });

    expect(result.userId).toBe('u-1');
    expect(result.status).toBe('DRAFT');
    expect(repo.rows).toHaveLength(1);
  });

  it('respects an explicit PUBLISHED status', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    const useCase = new CreateSuccessStoryUseCase(repo, stubLogger);

    const result = await useCase.execute({
      userId: 'u-1',
      headline: 'h',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
      status: 'PUBLISHED',
    });

    expect(result.status).toBe('PUBLISHED');
  });
});
