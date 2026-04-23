import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
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
@Injectable()
export class SseFlagStream implements OnModuleInit {
  private readonly subject = new Subject<FlagStreamMessage>();

  constructor(private readonly cache: RedisFlagCache) {}

  onModuleInit(): void {
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
