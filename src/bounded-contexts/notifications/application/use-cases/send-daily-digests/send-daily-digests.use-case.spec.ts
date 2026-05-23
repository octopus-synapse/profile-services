import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryNotificationEmail, InMemoryNotificationsRepository } from '../../../testing';
import { SendDailyDigestsUseCase } from './send-daily-digests.use-case';

describe('SendDailyDigestsUseCase', () => {
  let repo: InMemoryNotificationsRepository;
  let email: InMemoryNotificationEmail;
  let useCase: SendDailyDigestsUseCase;

  beforeEach(() => {
    repo = new InMemoryNotificationsRepository();
    email = new InMemoryNotificationEmail();
    useCase = new SendDailyDigestsUseCase(repo, email, stubLogger);
  });

  it('returns zeros when nobody is opted in', async () => {
    const result = await useCase.execute();
    expect(result).toEqual({ usersEmailed: 0, notificationsBatched: 0 });
  });

  it('emails one user with their pending notifications and marks them sent', async () => {
    repo.setRecipient('u-1', {
      id: 'u-1',
      name: 'Enzo',
      email: 'enzo@example.com',
      language: 'en',
    });
    repo.setPreferenceRow('u-1', 'POST_LIKED', {
      enabled: true,
      emailEnabled: true,
      emailDelivery: 'DAILY',
    });
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'a' });
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'b' });

    const result = await useCase.execute();

    expect(result.usersEmailed).toBe(1);
    expect(result.notificationsBatched).toBe(2);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.to).toBe('enzo@example.com');
  });

  it('does not double-send the same rows on the next run', async () => {
    repo.setRecipient('u-1', {
      id: 'u-1',
      name: 'Enzo',
      email: 'enzo@example.com',
      language: 'en',
    });
    repo.setPreferenceRow('u-1', 'POST_LIKED', {
      enabled: true,
      emailEnabled: true,
      emailDelivery: 'DAILY',
    });
    await repo.create({ userId: 'u-1', type: 'POST_LIKED', actorId: 'u-2', message: 'a' });

    await useCase.execute();
    const second = await useCase.execute();
    expect(second).toEqual({ usersEmailed: 0, notificationsBatched: 0 });
    expect(email.sent).toHaveLength(1);
  });
});
