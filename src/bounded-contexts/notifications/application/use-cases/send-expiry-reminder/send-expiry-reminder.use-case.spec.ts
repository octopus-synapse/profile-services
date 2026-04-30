import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryNotificationEmail,
  InMemoryNotificationStream,
  InMemoryNotificationsRepository,
  InMemoryReminderState,
} from '../../../testing';
import { CreateNotificationUseCase } from '../create-notification/create-notification.use-case';
import { SendExpiryReminderUseCase } from './send-expiry-reminder.use-case';

describe('SendExpiryReminderUseCase', () => {
  let repo: InMemoryNotificationsRepository;
  let state: InMemoryReminderState;
  let useCase: SendExpiryReminderUseCase;

  beforeEach(() => {
    repo = new InMemoryNotificationsRepository();
    state = new InMemoryReminderState();
    const create = new CreateNotificationUseCase(
      repo,
      new InMemoryNotificationStream(),
      new InMemoryNotificationEmail(),
      stubLogger,
    );
    useCase = new SendExpiryReminderUseCase(state, create, stubLogger);
  });

  it('creates a FIT_PROFILE_EXPIRY_REMINDER notification and sets the flag', async () => {
    await useCase.execute({
      userId: 'u-1',
      daysLeft: 7,
      expiresAt: '2026-05-04T00:00:00.000Z',
    });

    expect(repo.notifications).toHaveLength(1);
    expect(repo.notifications[0]?.type).toBe('FIT_PROFILE_EXPIRY_REMINDER');
    expect(state.seen.has('notif:fit-expiry-reminder:u-1:7')).toBe(true);
  });

  it('is a no-op when the flag is already set', async () => {
    state.seen.add('notif:fit-expiry-reminder:u-1:3');

    await useCase.execute({
      userId: 'u-1',
      daysLeft: 3,
      expiresAt: '2026-04-30T00:00:00.000Z',
    });

    expect(repo.notifications).toHaveLength(0);
  });
});
