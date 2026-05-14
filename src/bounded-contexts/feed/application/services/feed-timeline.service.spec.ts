import { describe, expect, it } from 'bun:test';
import { InMemoryFeedRepository } from '../../testing';
import { AnonymousMaskService } from './anonymous-mask.service';
import { FeedTimelineService } from './feed-timeline.service';

function make() {
  const repo = new InMemoryFeedRepository();
  const svc = new FeedTimelineService(repo, new AnonymousMaskService());
  return { repo, svc };
}

describe('FeedTimelineService', () => {
  it('returns empty when followingOnly and no follows', async () => {
    const { svc } = make();
    const out = await svc.getTimeline({
      userId: 'u1',
      limit: 20,
      followingOnly: true,
    });
    expect(out.items).toEqual([]);
    expect(out.nextCursor).toBeNull();
  });

  it('prioritizes followed authors and decorates viewer flags', async () => {
    const { repo, svc } = make();
    repo.seedPost({ id: 'p1', authorId: 'a1', isPublished: true });
    repo.seedPost({ id: 'p2', authorId: 'a2', isPublished: true });
    repo.seedFollow('viewer', 'a2');
    repo.seedLike('p1', 'viewer');

    const out = await svc.getTimeline({ userId: 'viewer', limit: 20, followingOnly: false });
    // p2 (followed) should come before p1 (not followed)
    expect(out.items[0].id).toBe('p2');
    expect(out.items[0].isLiked).toBe(false);
    const p1 = out.items.find((p) => p.id === 'p1');
    expect(p1?.isLiked).toBe(true);
  });
});
