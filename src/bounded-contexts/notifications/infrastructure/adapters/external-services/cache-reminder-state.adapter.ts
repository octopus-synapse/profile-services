/**
 * Adapter for `ReminderStatePort` backed by the platform `CacheService`
 * (Redis in prod, in-memory in tests).
 */

import type { CachePort } from '@/shared-kernel/cache/cache.port';
import { ReminderStatePort } from '../../../domain/ports/reminder-state.port';

export class CacheReminderStateAdapter extends ReminderStatePort {
  constructor(private readonly cache: CachePort) {
    super();
  }

  async wasReminderSent(key: string): Promise<boolean> {
    const v = await this.cache.get<boolean>(key);
    return v === true;
  }

  async recordReminderSent(key: string, ttlSeconds: number): Promise<void> {
    await this.cache.set(key, true, ttlSeconds);
  }
}
