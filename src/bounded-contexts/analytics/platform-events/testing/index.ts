/**
 * In-memory test doubles for the platform-events ports. The repository
 * collects whatever was persisted; the forwarder collects what was
 * forwarded and lets a test opt into a failure to exercise the
 * fire-and-forget error branch.
 */

import type { PlatformEvent } from '../domain/entities/platform-event';
import { PlatformEventsRepositoryPort } from '../domain/ports/platform-events.repository.port';
import { ProductAnalyticsForwarderPort } from '../domain/ports/product-analytics-forwarder.port';

export class InMemoryPlatformEventsRepository extends PlatformEventsRepositoryPort {
  readonly persisted: PlatformEvent[] = [];

  async persist(events: readonly PlatformEvent[]): Promise<{ accepted: number }> {
    this.persisted.push(...events);
    return { accepted: events.length };
  }
}

export class InMemoryProductAnalyticsForwarder extends ProductAnalyticsForwarderPort {
  readonly forwarded: PlatformEvent[][] = [];
  private failure: Error | null = null;

  failNextWith(err: Error): void {
    this.failure = err;
  }

  async forward(events: readonly PlatformEvent[]): Promise<void> {
    if (this.failure) {
      const err = this.failure;
      this.failure = null;
      throw err;
    }
    this.forwarded.push([...events]);
  }
}
