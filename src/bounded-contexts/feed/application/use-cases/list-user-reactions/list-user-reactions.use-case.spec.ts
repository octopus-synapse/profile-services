import { describe, expect, it } from 'bun:test';
import { InMemoryEngagementRepository } from '../../../testing';
import { ListUserReactionsUseCase } from './list-user-reactions.use-case';

describe('ListUserReactionsUseCase', () => {
  it('returns reactions for the user', async () => {
    const repo = new InMemoryEngagementRepository();
    repo.seedPost({ id: 'p1', authorId: 'someone', content: 'orig' });
    repo.seedLike('p1', 'me', 'LIKE');
    const out = await new ListUserReactionsUseCase(repo).execute('me', undefined, 20);
    expect(out.reactions).toHaveLength(1);
    expect(out.reactions[0].post.id).toBe('p1');
  });
});
