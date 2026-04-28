import { Subject } from 'rxjs';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import { RedisFlagCache } from '../cache/redis-flag-cache.service';

export interface FlagStreamMessage {
  data: { type: 'invalidate'; key?: string; at: string };
}

/**
 * Local hub for SSE connections. Every connected client subscribes to this
 * Subject; emitting an event here fans out to all current subscribers on
 * this node. Cross-node fan-out is handled by `RedisFlagCache` pub/sub:
 * on startup we hook its invalidate listener and re-emit locally, so a
 * toggle on one instance reaches clients on every instance.
 */

export class SseFlagStream implements Lifecycle {
  private readonly subject = new Subject<FlagStreamMessage>();

  constructor(private readonly cache: RedisFlagCache) {}

  async init(): Promise<void> {
    this.cache.onInvalidate(() => {
      this.subject.next({
        data: { type: 'invalidate', at: new Date().toISOString() },
      });
    });
  }

  observe() {
    return this.subject.asObservable();
  }

  emit(key?: string): void {
    this.subject.next({
      data: { type: 'invalidate', key, at: new Date().toISOString() },
    });
  }
}
