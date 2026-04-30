import type { EventEmitter } from 'node:events';
import { SocialEventBusPort } from '../../application/ports/social-event-bus.port';

/**
 * Framework-free adapter over an in-process emitter used for SSE-style
 * fan-out (`feed:user:${id}` channel). Takes any structurally-compatible
 * `EventEmitter` (Node's built-in works; the bootstrap passes whichever
 * emitter the shared `EventBusPort` is built on).
 */
export class EventEmitterSocialEventBusAdapter extends SocialEventBusPort {
  constructor(private readonly emitter: Pick<EventEmitter, 'emit'>) {
    super();
  }

  emit(eventName: string, payload: unknown): void {
    this.emitter.emit(eventName, payload);
  }
}
