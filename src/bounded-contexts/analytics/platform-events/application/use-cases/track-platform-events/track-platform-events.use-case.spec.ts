import { beforeEach, describe, expect, it } from 'bun:test';
import { stubLogger } from '@/shared-kernel/logger/testing';
import {
  InMemoryPlatformEventsRepository,
  InMemoryProductAnalyticsForwarder,
} from '../../../testing';
import { TrackPlatformEventsUseCase } from './track-platform-events.use-case';

// Recent timestamps so the P2-#23 clamp (`[now-7d, now+5min]`) leaves
// the events untouched. Using a hard-coded calendar date would drift
// outside the window as the suite ages.
const RECENT_1 = new Date(Date.now() - 60_000).toISOString();
const RECENT_2 = new Date(Date.now() - 30_000).toISOString();

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
        { event: 'page_view', props: { path: '/home' }, occurredAt: RECENT_1 },
        { event: 'click', occurredAt: RECENT_2 },
      ],
    });

    expect(result).toEqual({ accepted: 2 });
    expect(repo.persisted).toHaveLength(2);
    expect(repo.persisted[0]).toEqual({
      userId: 'user-1',
      event: 'page_view',
      props: { path: '/home' },
      occurredAt: new Date(RECENT_1),
    });
  });

  it('forwards the same batch to the product analytics provider', async () => {
    await useCase.execute(null, {
      events: [{ event: 'signup_started', occurredAt: RECENT_1 }],
    });
    // Forwarder is fire-and-forget; await a microtask to let it settle.
    await Promise.resolve();

    expect(forwarder.forwarded).toHaveLength(1);
    expect(forwarder.forwarded[0]?.[0]?.userId).toBeNull();
  });

  it('does not throw when the forwarder rejects', async () => {
    forwarder.failNextWith(new Error('PostHog 503'));

    const result = await useCase.execute('user-1', {
      events: [{ event: 'click', occurredAt: RECENT_1 }],
    });

    expect(result).toEqual({ accepted: 1 });
    expect(repo.persisted).toHaveLength(1);
  });

  it('clamps a far-past occurredAt to the 7-day floor (P2-#23)', async () => {
    const ancient = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const before = Date.now();
    await useCase.execute('user-1', { events: [{ event: 'click', occurredAt: ancient }] });
    const after = Date.now();

    const persisted = repo.persisted[0]?.occurredAt.getTime() ?? 0;
    // Clamp lands at roughly `now - 7 days` — bracket against the
    // before/after window so the test isn't flaky around the tick.
    const lower = before - 7 * 24 * 60 * 60 * 1000 - 5;
    const upper = after - 7 * 24 * 60 * 60 * 1000 + 5;
    expect(persisted).toBeGreaterThanOrEqual(lower);
    expect(persisted).toBeLessThanOrEqual(upper);
  });

  it('clamps a far-future occurredAt down to the +5min ceiling (P2-#23)', async () => {
    const farFuture = new Date('9999-12-31T00:00:00.000Z').toISOString();
    const before = Date.now();
    await useCase.execute('user-1', { events: [{ event: 'click', occurredAt: farFuture }] });
    const after = Date.now();

    const persisted = repo.persisted[0]?.occurredAt.getTime() ?? 0;
    const lower = before + 5 * 60 * 1000 - 5;
    const upper = after + 5 * 60 * 1000 + 5;
    expect(persisted).toBeGreaterThanOrEqual(lower);
    expect(persisted).toBeLessThanOrEqual(upper);
  });
});
