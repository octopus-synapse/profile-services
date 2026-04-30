import { describe, expect, it } from 'bun:test';
import { InMemoryNotificationsRepository } from '../../../testing';
import { DeleteOldNotificationsUseCase } from './delete-old-notifications.use-case';

describe('DeleteOldNotificationsUseCase', () => {
  it('removes rows older than the cutoff', async () => {
    const repo = new InMemoryNotificationsRepository();
    const old = await repo.create({
      userId: 'u-1',
      type: 'POST_LIKED',
      actorId: 'u-2',
      message: 'old',
    });
    // Backdate the row by 100 days.
    (old as { createdAt: Date }).createdAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'fresh' });

    const result = await new DeleteOldNotificationsUseCase(repo).execute(90);
    expect(result.count).toBe(1);
    expect(repo.notifications).toHaveLength(1);
  });
});
