/**
 * Pure-TS wiring for the platform/rate-limit BC. Zero `@nestjs/*`
 * imports.
 *
 * `RateLimitService` is a POJO that uses the platform CacheService
 * as its backend. The Nest-side `RateLimitGuard` keeps its own DI
 * wiring (it depends on Reflector + Express) — only the service is
 * exported here for non-Nest consumers.
 */

import type { CacheService } from '../cache/cache.service';
import { RateLimitService } from './rate-limit.service';

export { RateLimitService };

export function buildRateLimitService(cache: CacheService): RateLimitService {
  return new RateLimitService(cache);
}
