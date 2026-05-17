/**
 * `SseStreamPort` impl backed by Node's `EventEmitter`. Drops
 * `@nestjs/event-emitter` from the SSE path — same pub/sub semantics
 * exposed as an `Observable<SseEvent<T>>` via rxjs `fromEvent`.
 *
 * The Elysia adapter consumes the `Observable` and converts it to a
 * Bun `ReadableStream` of SSE-formatted bytes (see
 * `elysia-route-mounter.ts` SSE branch).
 *
 * P1 #44 — `setMaxListeners(0)` disabled Node's leak detector entirely,
 * so a runaway subscription bug couldn't be spotted until the process
 * OOMed. We raise the cap to `MAX_LISTENERS_PER_CHANNEL` (1000) — high
 * enough that legitimate live-feed fan-out doesn't trigger a false
 * positive, low enough that a real leak (a `subscribe` without a
 * matching unsubscribe in a per-request handler) trips the warning
 * within a few minutes of soak. `listenerCount(channel)` is exposed
 * so the health endpoint and Prometheus exporter can publish the
 * per-channel gauge.
 */

import { EventEmitter } from 'node:events';
import { fromEvent, map, type Observable } from 'rxjs';
import { type SseEvent, SseStreamPort } from '@/shared-kernel/http/sse-stream.port';

const MAX_LISTENERS_PER_CHANNEL = 1000;

export class InMemorySseStreamAdapter extends SseStreamPort {
  private readonly emitter = new EventEmitter();

  constructor() {
    super();
    this.emitter.setMaxListeners(MAX_LISTENERS_PER_CHANNEL);
  }

  subscribe<T>(channel: string): Observable<SseEvent<T>> {
    return (fromEvent(this.emitter, channel) as Observable<unknown>).pipe(
      map((payload): SseEvent<T> => ({ data: payload as T })),
    );
  }

  publish<T>(channel: string, payload: T): void {
    this.emitter.emit(channel, payload);
  }

  /**
   * Number of active listeners on `channel`. Surfaced via the health
   * endpoint so a slow leak is visible long before it OOMs the pod.
   */
  listenerCount(channel: string): number {
    return this.emitter.listenerCount(channel);
  }

  /**
   * Sum of listeners across every active channel — a single gauge the
   * health-check exposes as `sse_active_listeners_total`.
   */
  totalListenerCount(): number {
    let total = 0;
    for (const eventName of this.emitter.eventNames()) {
      total += this.emitter.listenerCount(eventName);
    }
    return total;
  }
}
