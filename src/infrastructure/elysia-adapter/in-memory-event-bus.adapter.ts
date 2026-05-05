/**
 * `EventBusPort` impl backed by Node's `EventEmitter`. Sufficient for
 * the Elysia POC; in-process pub/sub.
 */

import { EventEmitter } from 'node:events';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import { EventBusPort, type EventHandler } from '@/shared-kernel/event-bus/event-bus.port';

export class InMemoryEventBusAdapter extends EventBusPort {
  private readonly emitter = new EventEmitter();

  publish<T extends DomainEvent>(event: T): void {
    this.emitter.emit(event.eventType, event);
  }

  async publishAsync<T extends DomainEvent>(event: T): Promise<void> {
    this.emitter.emit(event.eventType, event);
  }

  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler as (event: unknown) => unknown);
  }
}
