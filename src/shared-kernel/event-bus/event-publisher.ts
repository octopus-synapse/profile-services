/**
 * Publish-only port kept as an alias of `EventBusPort` for the duration
 * of the migration — every existing call site (use cases, adapters)
 * imports `EventPublisherPort`. After the sweep, callers switch to
 * `EventBusPort` directly and this alias is deleted.
 *
 * Phase-2 cutover: `EventPublisher` is now backed by Node's
 * `EventEmitter` (no `@nestjs/event-emitter`). Wildcard `**` patterns
 * that the Nest version supported aren't required by any consumer; if
 * they ever are, swap in a tiny `EventEmitter2`-style matcher.
 */

import { EventEmitter } from 'node:events';
import type { DomainEvent } from './domain/domain-event';
import { EventBusPort, type EventHandler } from './event-bus.port';

export abstract class EventPublisherPort extends EventBusPort {}

export class EventPublisher extends EventPublisherPort {
  private readonly emitter = new EventEmitter();

  constructor() {
    super();
    // Domain events fan out to many handlers under load; the default
    // 10-listener cap fires false-positive `MaxListenersExceeded` warns.
    this.emitter.setMaxListeners(0);
  }

  publish<T extends DomainEvent>(event: T): void {
    this.emitter.emit(event.eventType, event);
  }

  async publishAsync<T extends DomainEvent>(event: T): Promise<void> {
    const listeners = this.emitter.listeners(event.eventType) as Array<
      (event: unknown) => void | Promise<void>
    >;
    for (const listener of listeners) {
      await listener(event);
    }
  }

  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler as (event: unknown) => unknown);
  }
}
