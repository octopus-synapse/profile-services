import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import { CachePort } from '../../../application/ports/tech-skills.port';

export class CacheAdapter extends CachePort {
  constructor(private readonly cache: CacheService) {
    super();
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cache.set(key, value, ttl);
  }
}
