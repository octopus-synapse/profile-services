/**
 * BullMQ adapter for `CacheInvalidationQueuePort` (P0-017).
 *
 * Wraps the existing `JobQueuePort` so a separate Redis connection
 * isn't needed — cache-invalidation jobs ride the same BullMQ broker
 * the rest of the app uses. The processor side reads `CacheInvalidationJob`
 * payloads and applies them against `CachePort` (via `delete` /
 * `deletePattern`) — both inputs are framework-typed primitives.
 *
 * The handler-side registration lives in the Elysia bootstrap:
 *
 *   queue.register('cache-invalidation', async (job) => {
 *     await applyCacheInvalidation(cache, job.data);
 *   });
 *
 * `applyCacheInvalidation` is exported here so any other consumer
 * (in-memory test queue, sweeper utility) can reuse the same dispatch
 * logic.
 */

import type { CachePort } from '@/shared-kernel/cache/cache.port';
import {
  type CacheInvalidationJob,
  CacheInvalidationQueuePort,
} from '@/shared-kernel/cache/cache-invalidation.queue';
import type { JobQueuePort } from '@/shared-kernel/jobs/job-queue.port';

export const CACHE_INVALIDATION_QUEUE = 'cache-invalidation';

export class BullMQCacheInvalidationAdapter extends CacheInvalidationQueuePort {
  constructor(private readonly queue: JobQueuePort) {
    super();
  }

  async enqueue(job: CacheInvalidationJob): Promise<void> {
    await this.queue.enqueue<CacheInvalidationJob>(CACHE_INVALIDATION_QUEUE, job);
  }
}

/**
 * Apply a queued `CacheInvalidationJob` against the cache. Exported so
 * the bootstrap can wire it as the queue processor without coupling
 * the BullMQ adapter to `CachePort`.
 */
export async function applyCacheInvalidation(
  cache: CachePort,
  job: CacheInvalidationJob,
): Promise<void> {
  if (job.kind === 'invalidate-key') {
    await cache.delete(job.key);
    return;
  }
  if (job.kind === 'invalidate-pattern') {
    await cache.deletePattern(job.pattern);
  }
}
