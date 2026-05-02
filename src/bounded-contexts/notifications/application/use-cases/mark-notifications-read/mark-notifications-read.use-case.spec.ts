import { describe, expect, it } from 'bun:test';
import { NotificationNotOwnedException } from '../../../domain/exceptions/notifications.exceptions';
import { InMemoryNotificationsRepository } from '../../../testing';
import { MarkNotificationsReadUseCase } from './mark-notifications-read.use-case';

describe('MarkNotificationsReadUseCase', () => {
  it('marks every unread notification for the user when no id is supplied', async () => {
    const repo = new InMemoryNotificationsRepository();
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'a' });
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'b' });

    const result = await new MarkNotificationsReadUseCase(repo).execute('u-1');
    expect(result.count).toBe(2);
    expect(await repo.countUnread('u-1')).toBe(0);
  });

  it('rejects with NotificationNotOwnedException when targeting another user’s row', async () => {
    const repo = new InMemoryNotificationsRepository();
    const owned = await repo.create({
      userId: 'u-other',
      type: 'POST_LIKED',
      actorId: 'u-2',
      message: 'someone else',
    });

    await expect(
      new MarkNotificationsReadUseCase(repo).execute('u-1', owned.id),
    ).rejects.toBeInstanceOf(NotificationNotOwnedException);
  });

  it('marks only the targeted row when an id is supplied', async () => {
    const repo = new InMemoryNotificationsRepository();
    const a = await repo.create({
      userId: 'u-1',
      type: 'POST_LIKED',
      actorId: 'u-2',
      message: 'a',
    });
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'b' });

    const result = await new MarkNotificationsReadUseCase(repo).execute('u-1', a.id);
    expect(result.count).toBe(1);
    expect(await repo.countUnread('u-1')).toBe(1);
  });
});
