/**
 * NestJS Event Bus Adapter
 *
 * Implements EventBusPort using NestJS EventEmitter2.
 * This is an ADAPTER - it lives in infrastructure layer.
 */
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DomainEvent } from '../domain/events';
import type { EventBusPort } from '../ports/event-bus.port';

@Injectable()
export class NestEventBusAdapter implements EventBusPort {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    // Use emitAsync to wait for all handlers (including async ones) to complete
    await this.eventEmitter.emitAsync(event.eventType, event);
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    await Promise.all(events.map((event) => this.publish(event)));
  }
}
