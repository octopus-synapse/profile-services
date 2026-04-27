import { describe, expect, it } from 'bun:test';
import { InMemorySuccessStoriesRepository } from '../../../testing';
import { ListPublishedSuccessStoriesUseCase } from './list-published-success-stories.use-case';

describe('ListPublishedSuccessStoriesUseCase', () => {
  it('returns only published stories', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    await repo.create({
      userId: 'u-1',
      headline: 'Published',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
      status: 'PUBLISHED',
    });
    await repo.create({
      userId: 'u-2',
      headline: 'Draft',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
      status: 'DRAFT',
    });

    const result = await new ListPublishedSuccessStoriesUseCase(repo).execute();

    expect(result).toHaveLength(1);
    expect(result[0]?.headline).toBe('Published');
  });

  it('respects an explicit limit', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    for (let i = 0; i < 5; i++) {
      await repo.create({
        userId: `u-${i}`,
        headline: `Story ${i}`,
        beforeText: 'b',
        afterText: 'a',
        quote: 'q',
        status: 'PUBLISHED',
      });
    }

    const result = await new ListPublishedSuccessStoriesUseCase(repo).execute(2);
    expect(result).toHaveLength(2);
  });

  it('orders by weight desc then publishedAt desc', async () => {
    const repo = new InMemorySuccessStoriesRepository();
    await repo.create({
      userId: 'u-low',
      headline: 'low weight',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
      status: 'PUBLISHED',
      weight: 0,
    });
    await repo.create({
      userId: 'u-high',
      headline: 'high weight',
      beforeText: 'b',
      afterText: 'a',
      quote: 'q',
      status: 'PUBLISHED',
      weight: 10,
    });

    const result = await new ListPublishedSuccessStoriesUseCase(repo).execute();
    expect(result[0]?.headline).toBe('high weight');
    expect(result[1]?.headline).toBe('low weight');
  });
});
