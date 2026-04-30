import { describe, expect, it } from 'bun:test';
import { InMemoryFeedRepository } from '../../../testing';
import { ListUserPostsUseCase } from './list-user-posts.use-case';

describe('ListUserPostsUseCase', () => {
  it('returns posts authored by the user, newest first', async () => {
    const repo = new InMemoryFeedRepository();
    repo.seedPost({ id: 'old', authorId: 'me', createdAt: new Date('2024-01-01') });
    repo.seedPost({ id: 'new', authorId: 'me', createdAt: new Date('2024-06-01') });
    repo.seedPost({ id: 'other', authorId: 'someone-else' });
    const out = await new ListUserPostsUseCase(repo).execute('me', undefined, 20);
    expect(out.posts.map((p) => p.id)).toEqual(['new', 'old']);
  });
});
