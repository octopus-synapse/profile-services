import { describe, expect, it } from 'bun:test';
import { InMemoryNotificationsRepository } from '../../../testing';
import { GetUnreadCountUseCase } from './get-unread-count.use-case';

describe('GetUnreadCountUseCase', () => {
  it('counts only unread rows for the requested user', async () => {
    const repo = new InMemoryNotificationsRepository();
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'a' });
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'b' });
    await repo.create({ userId: 'u-2', type: 'POST_LIKED', actorId: 'u-1', message: 'c' });

    const count = await new GetUnreadCountUseCase(repo).execute('u-1');
    expect(count).toBe(2);
  });
});
