/**
 * Event bus port — single contract for publishing **and** subscribing
 * to domain events. Replaces the publish-only `EventPublisherPort`
 * which now extends this. Adapters implement both sides; the only one
 * shipping today is the Nest `EventEmitter2`-backed adapter (see
 * `event-publisher.ts`).
 *
 * Why a single port? `@OnEvent`-decorated handlers couple registration
 * to Nest's discovery service. Once handlers register themselves
 * explicitly via `bus.on(EventClass.TYPE, handler.handle)`, the
 * subscribe path is framework-free and Nest goes away cleanly.
 */

import type { DomainEvent } from './domain/domain-event';

export type EventHandler<T extends DomainEvent> = (event: T) => void | Promise<void>;

export abstract class EventBusPort {
  abstract publish<T extends DomainEvent>(event: T): void;
  abstract publishAsync<T extends DomainEvent>(event: T): Promise<void>;
  /**
   * Subscribe a handler to events with the given `eventType`. The
   * convention is `EventClass.TYPE` (a `static readonly TYPE` on each
   * domain event class), which gives type-safe registration without a
   * global event map.
   */
  abstract on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void;
}
