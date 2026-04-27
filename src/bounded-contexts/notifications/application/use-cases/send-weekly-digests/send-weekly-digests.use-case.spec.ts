import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryNotificationEmail,
  InMemoryNotificationsRepository,
  InMemoryWeeklyDigestLog,
  InMemoryWeeklyDigestStats,
} from '../../../testing';
import { SendWeeklyDigestsUseCase } from './send-weekly-digests.use-case';

describe('SendWeeklyDigestsUseCase', () => {
  let repo: InMemoryNotificationsRepository;
  let stats: InMemoryWeeklyDigestStats;
  let log: InMemoryWeeklyDigestLog;
  let email: InMemoryNotificationEmail;
  let useCase: SendWeeklyDigestsUseCase;

  beforeEach(() => {
    repo = new InMemoryNotificationsRepository();
    stats = new InMemoryWeeklyDigestStats();
    log = new InMemoryWeeklyDigestLog();
    email = new InMemoryNotificationEmail();
    useCase = new SendWeeklyDigestsUseCase(repo, stats, log, email, stubLogger);
  });

  it('returns zeros when nobody is opted in', async () => {
    const result = await useCase.execute();
    expect(result).toEqual({ usersEmailed: 0, usersSkipped: 0 });
  });

  it('emails every eligible user when they have non-zero activity', async () => {
    repo.setPreferenceRow('u-1', 'POST_LIKED', {
      enabled: true,
      emailEnabled: true,
      emailDelivery: 'WEEKLY',
    });
    log.setRecipient({ id: 'u-1', name: 'Enzo', email: 'enzo@example.com' });
    stats.statsByUser.set('u-1', {
      resumeViews: 3,
      newFollowers: 0,
      newEndorsements: 0,
      profileViews: 0,
    });

    const result = await useCase.execute();
    expect(result.usersEmailed).toBe(1);
    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]?.text).toContain('3');
  });

  it('skips users with zero activity', async () => {
    repo.setPreferenceRow('u-1', 'POST_LIKED', {
      enabled: true,
      emailEnabled: true,
      emailDelivery: 'WEEKLY',
    });
    log.setRecipient({ id: 'u-1', name: 'Enzo', email: 'enzo@example.com' });
    // No stats seeded → all zeros.

    const result = await useCase.execute();
    expect(result.usersEmailed).toBe(0);
    expect(result.usersSkipped).toBe(1);
  });

  it('is idempotent inside the same ISO week', async () => {
    repo.setPreferenceRow('u-1', 'POST_LIKED', {
      enabled: true,
      emailEnabled: true,
      emailDelivery: 'WEEKLY',
    });
    log.setRecipient({ id: 'u-1', name: 'Enzo', email: 'enzo@example.com' });
    stats.statsByUser.set('u-1', {
      resumeViews: 5,
      newFollowers: 0,
      newEndorsements: 0,
      profileViews: 0,
    });

    await useCase.execute();
    const second = await useCase.execute();

    expect(second.usersEmailed).toBe(0);
    expect(second.usersSkipped).toBeGreaterThanOrEqual(1);
    expect(email.sent).toHaveLength(1);
  });
});
