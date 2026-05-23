/**
 * Ingests a batch of frontend product events:
 *   - persists every event through the `PlatformEventsRepositoryPort`
 *     (canonical audit trail; survives provider outages).
 *   - best-effort forwards the same batch through the
 *     `ProductAnalyticsForwarderPort` so the product team gets the
 *     data in the usual dashboard. A forwarder outage never drops a
 *     user-facing request — the forward is fire-and-forget and
 *     swallowed-with-log on failure.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { PlatformEvent } from '../../../domain/entities/platform-event';
import { PlatformEventsRepositoryPort } from '../../../domain/ports/platform-events.repository.port';
import { ProductAnalyticsForwarderPort } from '../../../domain/ports/product-analytics-forwarder.port';
import type { TrackEventsBodyDto } from '../../../dto/track-event.schema';

const CTX = 'TrackPlatformEventsUseCase';

// P2-#23: client-supplied `occurredAt` is clamped to a 7-day past
// window + 5-minute future tolerance. The past bound throttles backfill
// abuse (e.g. a malicious client trying to seed events with year-old
// timestamps that distort cohort dashboards). The future bound covers
// minor client clock skew while rejecting `"9999-12-31"` values that
// previously broke retention queries and dashboard widgets.
const PAST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function clampOccurredAt(input: string, now: Date): Date {
  const parsed = new Date(input);
  const nowMs = now.getTime();
  // Invalid date → snap to "now" so downstream consumers don't choke
  // on `Invalid Date` while we still preserve the row.
  if (Number.isNaN(parsed.getTime())) return now;
  const t = parsed.getTime();
  if (t < nowMs - PAST_WINDOW_MS) return new Date(nowMs - PAST_WINDOW_MS);
  if (t > nowMs + FUTURE_TOLERANCE_MS) return new Date(nowMs + FUTURE_TOLERANCE_MS);
  return parsed;
}

export class TrackPlatformEventsUseCase {
  constructor(
    private readonly repository: PlatformEventsRepositoryPort,
    private readonly forwarder: ProductAnalyticsForwarderPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string | null, body: TrackEventsBodyDto): Promise<{ accepted: number }> {
    const now = new Date();
    const events: PlatformEvent[] = body.events.map((e) => ({
      userId,
      event: e.event,
      props: e.props ?? null,
      occurredAt: clampOccurredAt(e.occurredAt, now),
    }));

    const result = await this.repository.persist(events);
    void this.forwarder.forward(events).catch((err: unknown) => {
      this.logger.warn(`Product analytics forward failed: ${(err as Error).message}`, CTX);
    });
    return result;
  }
}
