/**
 * `SseStreamPort` impl backed by Node's `EventEmitter`. Drops
 * `@nestjs/event-emitter` from the SSE path — same pub/sub semantics
 * exposed as an `Observable<SseEvent<T>>` via rxjs `fromEvent`.
 *
 * The Elysia adapter consumes the `Observable` and converts it to a
 * Bun `ReadableStream` of SSE-formatted bytes (see
 * `elysia-route-mounter.ts` SSE branch).
 */

import { EventEmitter } from 'node:events';
import { fromEvent, map, type Observable } from 'rxjs';
import { type SseEvent, SseStreamPort } from '@/shared-kernel/http/sse-stream.port';

export class InMemorySseStreamAdapter extends SseStreamPort {
  private readonly emitter = new EventEmitter();

  constructor() {
    super();
    // SSE channels can fan out to many concurrent listeners; the default
    // 10-listener cap fires false-positive warnings under load.
    this.emitter.setMaxListeners(0);
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
