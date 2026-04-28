import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { fromEvent, map, type Observable } from 'rxjs';
import { type SseEvent, SseStreamPort } from '@/shared-kernel/http/sse-stream.port';

/**
 * `SseStreamPort` adapter backed by Nest's `EventEmitter2`. Confines
 * the `@nestjs/event-emitter` dependency to the Nest adapter layer so
 * route handlers, bundles and SSE module wiring never import it
 * directly.
 *
 * `subscribe(channel)` wraps `fromEvent` and lifts each payload into
 * the framework-free `SseEvent<T>` shape. Adapters that need richer
 * envelopes (id, type, retry) can wrap this Observable with `map(...)`
 * — the port intentionally stays minimal.
 *
 * `publish(channel, payload)` proxies straight to `emitter.emit`. Used
 * for SSE-trigger fan-out and for cross-cutting handlers that share the
 * same underlying emitter via `EventBusPort.on`.
 */
@Injectable()
export class NestSseStreamAdapter extends SseStreamPort {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  subscribe<T>(channel: string): Observable<SseEvent<T>> {
    return (fromEvent(this.emitter, channel) as Observable<unknown>).pipe(
      map((payload): SseEvent<T> => ({ data: payload as T })),
    );
  }

  publish<T>(channel: string, payload: T): void {
    this.emitter.emit(channel, payload);
  }
}
