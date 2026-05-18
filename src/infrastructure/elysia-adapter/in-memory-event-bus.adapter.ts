/**
 * `EventBusPort` impl backed by Node's `EventEmitter`. Sufficient for
 * the Elysia POC; in-process pub/sub.
 *
 * P2-099 — multi-instance constraint
 * ----------------------------------
 * This adapter is **single-process only**. When the service is
 * deployed with `replicas > 1` (production today), an event published
 * on instance A is delivered ONLY to handlers registered on instance
 * A. Audit log writes, projection updates, and metric counters that
 * subscribe via this bus will therefore process events emitted by
 * their own instance and miss everything emitted elsewhere.
 *
 * The current production wiring stays correct because every handler
 * we ship is co-located with its publisher (audit handlers live in
 * the same composition that emits the auth event, projection updates
 * live in the same BC that mutates the aggregate, etc.). Cross-
 * instance fan-out is intentionally not supported.
 *
 * If a future handler needs to react to events from sibling
 * instances (e.g. cache invalidation, search index updates that fan
 * out across the cluster), do NOT add a "Redis pub/sub layer" on top
 * of this adapter — replace the adapter with a transport-aware bus
 * (BullMQ topic, NATS, Redpanda) so failure semantics are explicit
 * at the port boundary instead of bolted on.
 */

import { EventEmitter } from 'node:events';
import type { DomainEvent } from '@/shared-kernel/event-bus/domain/domain-event';
import { EventBusPort, type EventHandler } from '@/shared-kernel/event-bus/event-bus.port';

export class InMemoryEventBusAdapter extends EventBusPort {
  private readonly emitter = new EventEmitter();

  publish<T extends DomainEvent>(event: T): void {
    this.emitter.emit(event.eventType, event);
  }

  /**
   * P2-#7 (event-publishing async leak): unlike `publish`, this variant
   * actually awaits each subscribed handler — even async ones. Node's
   * `EventEmitter.emit()` invokes listeners synchronously and silently
   * drops any Promise they return, which the BUG_REPORT flagged as an
   * async leak. We replicate `emit`'s listener-snapshot semantics (so
   * a listener that unsubscribes mid-emit doesn't trip us up) and then
   * await the collected promises with `Promise.allSettled`, surfacing
   * the first rejection on the caller side. State-mutating callers
   * (audit, cleanup, projection sync) use this method so a handler
   * failure becomes visible at the publisher.
   */
  async publishAsync<T extends DomainEvent>(event: T): Promise<void> {
    const listeners = this.emitter.listeners(event.eventType) as Array<
      (event: T) => unknown | Promise<unknown>
    >;
    const results = await Promise.allSettled(listeners.map((fn) => fn(event)));
    const firstRejection = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (firstRejection) throw firstRejection.reason;
  }

  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler as (event: unknown) => unknown);
  }
}
