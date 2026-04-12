/**
 * In-Memory Event Bus for Testing
 *
 * Captures published domain events for test verification.
 * Migrated from StubEventBus.
 */

import type { DomainEvent } from '../../domain/events';
import type { EventBusPort } from '../../ports/event-bus.port';

export interface PublishedEvent {
  event: DomainEvent;
  publishedAt: Date;
}

export class InMemoryEventBus implements EventBusPort {
  private events: PublishedEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.events.push({
      event,
      publishedAt: new Date(),
    });
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  // ───────────────────────────────────────────────────────────────
  // Test Helpers
  // ───────────────────────────────────────────────────────────────

  getPublishedEvents(): DomainEvent[] {
    return this.events.map((e) => e.event);
  }

  getEventsByType<T extends DomainEvent>(type: abstract new (...args: never[]) => T): T[] {
    return this.events.filter((e) => e.event instanceof type).map((e) => e.event as T);
  }

  hasPublished<T extends DomainEvent>(type: abstract new (...args: never[]) => T): boolean {
    return this.events.some((e) => e.event instanceof type);
  }

  getLastEvent(): DomainEvent | undefined {
    return this.events[this.events.length - 1]?.event;
  }

  clear(): void {
    this.events = [];
  }
}
