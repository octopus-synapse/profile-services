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

  async publishAsync<T extends DomainEvent>(event: T): Promise<void> {
    this.emitter.emit(event.eventType, event);
  }

  on<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    this.emitter.on(eventType, handler as (event: unknown) => unknown);
  }
}
