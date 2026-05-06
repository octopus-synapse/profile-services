import type { LoggerPort } from '@/shared-kernel/logger/logger.port';
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
 *
 * P1-036 — when a `logger` is supplied, the helper wraps the handler
 * call in try/catch and logs `error` on throw rather than letting the
 * exception bubble back to the bus loop (which would tear down the
 * publishing use case for a side-effect failure that the publisher
 * doesn't care about). Compliance handlers that MUST raise (e.g. the
 * strict audit log) should NOT pass a logger here — they want the
 * error to propagate so the bus's strict-mode write fails the request.
 */
export function registerHandler<T extends DomainEvent>(
  bus: EventBusPort,
  eventClass: { readonly TYPE: string },
  handler: EventHandlerLike<T>,
  options: { logger?: LoggerPort; context?: string } = {},
): void {
  if (!options.logger) {
    bus.on<T>(eventClass.TYPE, (event) => handler.handle(event));
    return;
  }
  const { logger, context } = options;
  const tag = context ?? handler.constructor.name;
  bus.on<T>(eventClass.TYPE, async (event) => {
    try {
      await handler.handle(event);
    } catch (err) {
      logger.error(`Handler ${tag} failed for ${eventClass.TYPE}`, {
        context: tag,
        stack: err instanceof Error ? err.stack : undefined,
        eventType: eventClass.TYPE,
        aggregateId: (event as DomainEvent).aggregateId,
      });
    }
  });
}
