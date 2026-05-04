import type { DomainEvent } from './domain/domain-event';
import type { EventBusPort } from './event-bus.port';

/**
 * Domain event handlers shaped for `registerHandler` auto-binding.
 *
 * Implementations expose a static `TYPE` constant matching the event's
 * `static TYPE` and a `handle(event)` method. The helper takes care of
 * `bind` so call-site boilerplate disappears (Q34 in the duplication
 * audit).
 */
export interface EventHandlerLike<T extends DomainEvent> {
  handle(event: T): void | Promise<void>;
}

export interface EventHandlerConstructor<T extends DomainEvent> {
  readonly TYPE: string;
  new (...args: never[]): EventHandlerLike<T>;
}

/**
 * Subscribe a handler to its event class on the bus, binding `handle`
 * automatically.
 *
 * Replaces the ~12 inline `bus.on(EventClass.TYPE, h.handle.bind(h))`
 * sites scattered across BC `register-handlers.ts` files.
 */
export function registerHandler<T extends DomainEvent>(
  bus: EventBusPort,
  eventClass: { readonly TYPE: string },
  handler: EventHandlerLike<T>,
): void {
  bus.on<T>(eventClass.TYPE, (event) => handler.handle(event));
}
