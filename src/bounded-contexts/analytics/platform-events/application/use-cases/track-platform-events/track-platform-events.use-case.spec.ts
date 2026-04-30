import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryPlatformEventsRepository,
  InMemoryProductAnalyticsForwarder,
} from '../../../testing';
import { TrackPlatformEventsUseCase } from './track-platform-events.use-case';

describe('TrackPlatformEventsUseCase', () => {
  let repo: InMemoryPlatformEventsRepository;
  let forwarder: InMemoryProductAnalyticsForwarder;
  let useCase: TrackPlatformEventsUseCase;

  beforeEach(() => {
    repo = new InMemoryPlatformEventsRepository();
    forwarder = new InMemoryProductAnalyticsForwarder();
    useCase = new TrackPlatformEventsUseCase(repo, forwarder, stubLogger);
  });

  it('persists the batch and reports the accepted count', async () => {
    const result = await useCase.execute('user-1', {
      events: [
        { event: 'page_view', props: { path: '/home' }, occurredAt: '2026-04-26T12:00:00.000Z' },
        { event: 'click', occurredAt: '2026-04-26T12:00:01.000Z' },
      ],
    });

    expect(result).toEqual({ accepted: 2 });
    expect(repo.persisted).toHaveLength(2);
    expect(repo.persisted[0]).toEqual({
      userId: 'user-1',
      event: 'page_view',
      props: { path: '/home' },
      occurredAt: new Date('2026-04-26T12:00:00.000Z'),
    });
  });

  it('forwards the same batch to the product analytics provider', async () => {
    await useCase.execute(null, {
      events: [{ event: 'signup_started', occurredAt: '2026-04-26T12:00:00.000Z' }],
    });
    // Forwarder is fire-and-forget; await a microtask to let it settle.
    await Promise.resolve();

    expect(forwarder.forwarded).toHaveLength(1);
    expect(forwarder.forwarded[0]?.[0]?.userId).toBeNull();
  });

  it('does not throw when the forwarder rejects', async () => {
    forwarder.failNextWith(new Error('PostHog 503'));

    const result = await useCase.execute('user-1', {
      events: [{ event: 'click', occurredAt: '2026-04-26T12:00:00.000Z' }],
    });

    expect(result).toEqual({ accepted: 1 });
    expect(repo.persisted).toHaveLength(1);
  });
});
