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
import type { TrackEventsBodyDto } from '../../../dto/track-event.dto';

const CTX = 'TrackPlatformEventsUseCase';

export class TrackPlatformEventsUseCase {
  constructor(
    private readonly repository: PlatformEventsRepositoryPort,
    private readonly forwarder: ProductAnalyticsForwarderPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(userId: string | null, body: TrackEventsBodyDto): Promise<{ accepted: number }> {
    const events: PlatformEvent[] = body.events.map((e) => ({
      userId,
      event: e.event,
      props: e.props ?? null,
      occurredAt: new Date(e.occurredAt),
    }));

    const result = await this.repository.persist(events);
    void this.forwarder.forward(events).catch((err: unknown) => {
      this.logger.warn(`Product analytics forward failed: ${(err as Error).message}`, CTX);
    });
    return result;
  }
}
