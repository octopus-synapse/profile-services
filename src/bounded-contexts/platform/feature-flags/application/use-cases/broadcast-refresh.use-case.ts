import { Injectable } from '@nestjs/common';
import { RedisFlagCache } from '../../infrastructure/cache/redis-flag-cache.service';
import { FlagStateService } from '../services/flag-state.service';

/**
 * Admin-triggered "refresh all clients" broadcast. Invalidates caches across
 * every instance and pushes an invalidate message to every connected SSE
 * client, so every browser drops its local flag snapshot and refetches.
 */
@Injectable()
export class BroadcastRefreshUseCase {
  constructor(
    private readonly cache: RedisFlagCache,
    private readonly state: FlagStateService,
  ) {}

  async execute(): Promise<void> {
    this.state.markStale();
    await this.cache.invalidateAll();
  }
}
