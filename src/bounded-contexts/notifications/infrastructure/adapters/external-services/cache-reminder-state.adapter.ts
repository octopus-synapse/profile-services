/**
 * Adapter for `ReminderStatePort` backed by the platform `CacheService`
 * (Redis in prod, in-memory in tests).
 */

import { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { ReminderStatePort } from '../../../domain/ports/reminder-state.port';

export class CacheReminderStateAdapter extends ReminderStatePort {
  constructor(private readonly cache: CacheService) {
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
