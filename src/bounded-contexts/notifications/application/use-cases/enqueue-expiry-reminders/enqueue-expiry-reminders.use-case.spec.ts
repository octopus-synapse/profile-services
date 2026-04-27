import { beforeEach, describe, expect, it } from 'bun:test';
import { InMemoryFitProfileExpiryRead, InMemoryReminderState } from '../../../testing';
import { EnqueueExpiryRemindersUseCase } from './enqueue-expiry-reminders.use-case';

describe('EnqueueExpiryRemindersUseCase', () => {
  let read: InMemoryFitProfileExpiryRead;
  let state: InMemoryReminderState;
  let useCase: EnqueueExpiryRemindersUseCase;
  const now = new Date('2026-04-27T12:00:00Z');

  beforeEach(() => {
    read = new InMemoryFitProfileExpiryRead();
    state = new InMemoryReminderState();
    useCase = new EnqueueExpiryRemindersUseCase(read, state);
  });

  it('returns one job per (user, window) when due and standard', async () => {
    // Expires in ~7 days from `now`.
    const expiresAt7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    read.rows.push({
      userId: 'u-1',
      expiresAt: expiresAt7,
      userRoles: ['role_user_standard'],
    });

    const jobs = await useCase.execute(now);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.userId).toBe('u-1');
    expect(jobs[0]?.daysLeft).toBe(7);
  });

  it('skips users without the standard role', async () => {
    const expiresAt7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    read.rows.push({
      userId: 'u-1',
      expiresAt: expiresAt7,
      userRoles: ['role_admin'],
    });

    const jobs = await useCase.execute(now);
    expect(jobs).toHaveLength(0);
  });

  it('skips users with the already-sent flag set', async () => {
    const expiresAt1 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    read.rows.push({
      userId: 'u-1',
      expiresAt: expiresAt1,
      userRoles: ['role_user_standard'],
    });
    state.seen.add('notif:fit-expiry-reminder:u-1:1');

    const jobs = await useCase.execute(now);
    expect(jobs).toHaveLength(0);
  });
});
