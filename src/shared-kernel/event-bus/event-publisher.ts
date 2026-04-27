import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DomainEvent } from './domain/domain-event';
import { EventBusPort, type EventHandler } from './event-bus.port';

/**
 * Publish-only port kept as an alias of `EventBusPort` for the duration
 * of the migration — every existing call site (use cases, adapters)
 * imports `EventPublisherPort`. After the sweep, callers switch to
 * `EventBusPort` directly and this alias is deleted.
 */
export abstract class EventPublisherPort extends EventBusPort {}

@Injectable()
export class EventPublisher extends EventPublisherPort {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  publish<T extends DomainEvent>(event: T): void {
    this.emitter.emit(event.eventType, event);
  }

  async publishAsync<T extends DomainEvent>(event: T): Promise<void> {
    await this.emitter.emitAsync(event.eventType, event);
  }

  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler as (event: unknown) => unknown);
  }
}
