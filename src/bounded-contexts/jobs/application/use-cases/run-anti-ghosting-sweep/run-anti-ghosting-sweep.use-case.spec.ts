import { describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import { InMemoryAntiGhostingEmailer, InMemoryAntiGhostingRepository } from '../../../testing';
import { RunAntiGhostingSweepUseCase } from './run-anti-ghosting-sweep.use-case';

const DAY = 24 * 60 * 60 * 1000;

describe('RunAntiGhostingSweepUseCase', () => {
  it('returns zero when no candidates are stale', async () => {
    const repo = new InMemoryAntiGhostingRepository();
    const emailer = new InMemoryAntiGhostingEmailer();
    const out = await new RunAntiGhostingSweepUseCase(repo, emailer, stubLogger).execute();
    expect(out).toEqual({ scanned: 0, reminded: 0 });
    expect(emailer.sent).toHaveLength(0);
  });

  it('reminds at the highest crossed threshold and writes log + notification', async () => {
    const repo = new InMemoryAntiGhostingRepository();
    const emailer = new InMemoryAntiGhostingEmailer();
    const now = new Date('2026-02-10T00:00:00.000Z');
    repo.seedCandidate({
      id: 'app-1',
      userId: 'u-1',
      createdAt: new Date(now.getTime() - 14 * DAY),
      updatedAt: new Date(now.getTime() - 14 * DAY),
      jobTitle: 'Backend',
      company: 'Acme',
    });
    repo.seedUser('u-1', { email: 'u@example.com', name: 'Enzo' });

    const out = await new RunAntiGhostingSweepUseCase(repo, emailer, stubLogger).execute(now);

    expect(out).toEqual({ scanned: 1, reminded: 1 });
    expect(emailer.sent).toHaveLength(1);
    expect(emailer.sent[0]?.to).toBe('u@example.com');
    expect(repo.notifications).toHaveLength(1);
    expect(repo.notifications[0]?.daysSilent).toBe(14);
    expect(await repo.hasReminderBeenSent('app-1', 14)).toBe(true);
  });

  it('skips candidates whose last event is a silencing one (e.g. FOLLOW_UP_SENT)', async () => {
    const repo = new InMemoryAntiGhostingRepository();
    const emailer = new InMemoryAntiGhostingEmailer();
    const now = new Date('2026-02-10T00:00:00.000Z');
    repo.seedCandidate({
      id: 'app-1',
      userId: 'u-1',
      createdAt: new Date(now.getTime() - 21 * DAY),
      updatedAt: new Date(now.getTime() - 21 * DAY),
      lastEvent: {
        type: 'FOLLOW_UP_SENT',
        occurredAt: new Date(now.getTime() - 1 * DAY),
      },
    });
    repo.seedUser('u-1', { email: 'u@example.com', name: null });

    const out = await new RunAntiGhostingSweepUseCase(repo, emailer, stubLogger).execute(now);

    expect(out.reminded).toBe(0);
    expect(emailer.sent).toHaveLength(0);
  });

  it('does not double-nag when a reminder log already exists for that threshold', async () => {
    const repo = new InMemoryAntiGhostingRepository();
    const emailer = new InMemoryAntiGhostingEmailer();
    const now = new Date('2026-02-10T00:00:00.000Z');
    repo.seedCandidate({
      id: 'app-1',
      userId: 'u-1',
      createdAt: new Date(now.getTime() - 8 * DAY),
      updatedAt: new Date(now.getTime() - 8 * DAY),
    });
    repo.seedUser('u-1', { email: 'u@example.com', name: null });
    await repo.recordReminderLog('app-1', 7);

    const out = await new RunAntiGhostingSweepUseCase(repo, emailer, stubLogger).execute(now);

    expect(out).toEqual({ scanned: 1, reminded: 0 });
    expect(emailer.sent).toHaveLength(0);
  });

  it('continues after a transport failure rather than throwing', async () => {
    const repo = new InMemoryAntiGhostingRepository();
    const emailer = new InMemoryAntiGhostingEmailer();
    const now = new Date('2026-02-10T00:00:00.000Z');
    repo.seedCandidate({
      id: 'app-1',
      userId: 'u-1',
      createdAt: new Date(now.getTime() - 8 * DAY),
      updatedAt: new Date(now.getTime() - 8 * DAY),
    });
    repo.seedUser('u-1', { email: 'u@example.com', name: null });
    emailer.failNextWith(new Error('SMTP down'));

    const out = await new RunAntiGhostingSweepUseCase(repo, emailer, stubLogger).execute(now);

    // Reminder log + notification still recorded — the worker treats
    // mail-transport failures as best-effort.
    expect(out).toEqual({ scanned: 1, reminded: 1 });
    expect(repo.notifications).toHaveLength(1);
    expect(await repo.hasReminderBeenSent('app-1', 7)).toBe(true);
  });
});
