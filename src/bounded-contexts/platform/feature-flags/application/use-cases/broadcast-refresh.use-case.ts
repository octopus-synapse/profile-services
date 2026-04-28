import { LoggerPort } from '@/shared-kernel';
import type { FlagCachePort } from '../ports/flag-cache.port';
import { FlagStateService } from '../services/flag-state.service';

/**
 * Admin-triggered "refresh all clients" broadcast. Invalidates caches across
 * every instance and pushes an invalidate message to every connected SSE
 * client, so every browser drops its local flag snapshot and refetches.
 */
export class BroadcastRefreshUseCase {
  constructor(
    private readonly cache: FlagCachePort,
    private readonly state: FlagStateService,
    private readonly logger: LoggerPort,
  ) {
    void this.logger;
  }

  async execute(): Promise<void> {
    this.state.markStale();
    await this.cache.invalidateAll();
  }
}
