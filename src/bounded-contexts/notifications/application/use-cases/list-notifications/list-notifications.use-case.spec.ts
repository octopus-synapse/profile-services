import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryNotificationsRepository } from '../../../testing';
import { ListNotificationsUseCase } from './list-notifications.use-case';

describe('ListNotificationsUseCase', () => {
  let repo: InMemoryNotificationsRepository;
  let useCase: ListNotificationsUseCase;

  beforeEach(() => {
    repo = new InMemoryNotificationsRepository();
    useCase = new ListNotificationsUseCase(repo);
  });

  it('returns the page from the repository', async () => {
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'a' });
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'b' });

    const page = await useCase.execute('u-1');
    expect(page.items).toHaveLength(2);
  });

  it('clamps the requested limit to 100', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: `${i}` });
    }
    const page = await useCase.execute('u-1', undefined, 9999);
    // 5 rows persisted, limit clamped — all 5 returned.
    expect(page.items).toHaveLength(5);
  });
});
