import { describe, expect, it } from 'bun:test';
import { InMemoryFeedRepository } from '../../testing';
import { FeedTimelineService } from './feed-timeline.service';

function make() {
  const repo = new InMemoryFeedRepository();
  const svc = new FeedTimelineService(repo);
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

  it('paginates deterministically when many posts share createdAt (P1 #35)', async () => {
    const { repo, svc } = make();
    const sharedCreatedAt = new Date('2026-05-17T00:00:00.000Z');
    const POST_COUNT = 12;
    const PAGE_SIZE = 4;
    for (let i = 0; i < POST_COUNT; i++) {
      repo.seedPost({
        id: `post-${String(i).padStart(2, '0')}`,
        authorId: 'a1',
        isPublished: true,
        createdAt: sharedCreatedAt,
      });
    }

    const seen = new Set<string>();
    let cursor: string | undefined;
    let pageCount = 0;
    const MAX_PAGES = 10;
    while (pageCount < MAX_PAGES) {
      const page = await svc.getTimeline({
        userId: 'viewer',
        limit: PAGE_SIZE,
        followingOnly: false,
        cursor,
      });
      for (const item of page.items) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
      }
      cursor = page.nextCursor ?? undefined;
      pageCount++;
      if (!page.hasNext) break;
    }
    expect(seen.size).toBe(POST_COUNT);
  });
});
