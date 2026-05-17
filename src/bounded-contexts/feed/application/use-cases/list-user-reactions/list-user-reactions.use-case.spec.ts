import { describe, expect, it } from 'bun:test';
import { InMemoryEngagementRepository } from '../../../testing';
import { ListUserLikesUseCase } from './list-user-reactions.use-case';

describe('ListUserLikesUseCase', () => {
  it('returns likes for the user', async () => {
    const repo = new InMemoryEngagementRepository();
    repo.seedPost({ id: 'p1', authorId: 'someone', content: 'orig' });
    repo.seedLike('p1', 'me');
    const out = await new ListUserLikesUseCase(repo).execute('me', undefined, 20);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].post.id).toBe('p1');
  });
});
