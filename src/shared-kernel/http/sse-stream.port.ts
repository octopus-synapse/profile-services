import type { Observable } from 'rxjs';

/**
 * Framework-free SSE stream subscription. Concrete adapters (Nest's
 * `EventEmitter2`-backed today, future Bun-native) implement this so
 * route handlers / bundles never touch `EventEmitter2` directly.
 *
 * `subscribe(channel)` returns an Observable of typed `SseEvent`s for
 * channel-based fan-out (the typical SSE pattern).
 *
 * `publish(channel, payload)` is the symmetric write side — used by
 * route handlers that need to fan-out a trigger to live SSE
 * subscribers (e.g. "onboarding data changed → re-render preview"
 * or to drive cross-cutting handlers registered via `EventBusPort.on`
 * that share the same underlying emitter at the adapter layer).
 */
export interface SseEvent<T = unknown> {
  readonly data: T;
  readonly id?: string;
  readonly type?: string;
  readonly retry?: number;
}

export abstract class SseStreamPort {
  abstract subscribe<T>(channel: string): Observable<SseEvent<T>>;
  abstract publish<T>(channel: string, payload: T): void;
}
