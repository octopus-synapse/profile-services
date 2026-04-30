import { describe, expect, it } from 'bun:test';
import { InMemoryApplicationTrackerRepository } from '../../../testing';
import { ListApplicationTimelineUseCase } from './list-application-timeline.use-case';

const DAY = 24 * 60 * 60 * 1000;

describe('ListApplicationTimelineUseCase', () => {
  it('returns an empty list when the user has no applications', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    const result = await new ListApplicationTimelineUseCase(repo).execute('u-1');
    expect(result).toEqual([]);
  });

  it('marks needsFollowUp once silence threshold is crossed and no follow-up exists', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    const now = new Date('2026-01-20T00:00:00.000Z');
    repo.seedApplication({
      id: 'app-1',
      userId: 'u-1',
      createdAt: new Date(now.getTime() - 12 * DAY),
      events: [
        {
          type: 'SUBMITTED',
          occurredAt: new Date(now.getTime() - 12 * DAY),
        },
      ],
    });

    const result = await new ListApplicationTimelineUseCase(repo).execute('u-1', 10, now);

    expect(result).toHaveLength(1);
    expect(result[0]?.needsFollowUp).toBe(true);
    expect(result[0]?.daysSinceLastResponse).toBeNull();
  });

  it('clears needsFollowUp when a recent FOLLOW_UP_SENT event exists', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    const now = new Date('2026-01-20T00:00:00.000Z');
    repo.seedApplication({
      id: 'app-2',
      userId: 'u-1',
      createdAt: new Date(now.getTime() - 12 * DAY),
      events: [
        { type: 'SUBMITTED', occurredAt: new Date(now.getTime() - 12 * DAY) },
        { type: 'FOLLOW_UP_SENT', occurredAt: new Date(now.getTime() - 2 * DAY) },
      ],
    });

    const result = await new ListApplicationTimelineUseCase(repo).execute('u-1', 10, now);
    expect(result[0]?.needsFollowUp).toBe(false);
  });

  it('clears needsFollowUp when the application is in a terminal state (offer)', async () => {
    const repo = new InMemoryApplicationTrackerRepository();
    const now = new Date('2026-01-20T00:00:00.000Z');
    repo.seedApplication({
      id: 'app-3',
      userId: 'u-1',
      createdAt: new Date(now.getTime() - 30 * DAY),
      events: [
        { type: 'SUBMITTED', occurredAt: new Date(now.getTime() - 30 * DAY) },
        { type: 'OFFER_RECEIVED', occurredAt: new Date(now.getTime() - 15 * DAY) },
      ],
    });

    const result = await new ListApplicationTimelineUseCase(repo).execute('u-1', 10, now);
    expect(result[0]?.needsFollowUp).toBe(false);
    expect(result[0]?.daysSinceLastResponse).toBe(15);
  });
});
