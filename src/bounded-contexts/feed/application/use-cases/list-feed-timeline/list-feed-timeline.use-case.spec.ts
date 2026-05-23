import { describe, expect, it } from 'bun:test';
import { InMemoryFeedRepository } from '../../../testing';
import { FeedTimelineService } from '../../services/feed-timeline.service';
import { ListFeedTimelineUseCase } from './list-feed-timeline.use-case';

describe('ListFeedTimelineUseCase', () => {
  it('delegates to FeedTimelineService', async () => {
    const repo = new InMemoryFeedRepository();
    repo.seedPost({ id: 'p1', authorId: 'a' });
    const useCase = new ListFeedTimelineUseCase(new FeedTimelineService(repo));
    const out = await useCase.execute({
      userId: 'viewer',
      limit: 10,
      followingOnly: false,
    });
    expect(out.items.map((p) => p.id)).toContain('p1');
  });
});
