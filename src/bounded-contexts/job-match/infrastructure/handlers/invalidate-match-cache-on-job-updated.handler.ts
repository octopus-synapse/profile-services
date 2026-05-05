/**
 * P0-017: invalidate the Match cache when a job is updated.
 *
 * Without this handler, `JobUpdatedEvent` was published with no
 * subscriber — Match scores cached against the old job description
 * stayed live until the per-key TTL expired (24h). Recruiters editing
 * a job would see candidates ranked against stale criteria.
 *
 * Design (sync + queue fallback):
 *   1. Try a synchronous `cache.deletePattern('match:*:<jobId>:*')`.
 *      Happy path: cache flushes immediately, next match recomputes.
 *   2. If the sync call throws (Redis blip, connection reset), enqueue
 *      a `CacheInvalidationQueue` job with the same pattern. BullMQ's
 *      retry/backoff handles the transient failure; nothing is lost.
 *
 * Strict mode would propagate the failure and unstick the event bus
 * loop — bad in this context because the user's update succeeded and
 * we don't want a stale-cache nuisance to look like a 500. Lenient
 * sync + queue handoff gives us "best effort with durable backstop".
 */

import type { JobUpdatedEvent } from '@/bounded-contexts/jobs/domain/events';
import type { CachePort } from '@/shared-kernel/cache/cache.port';
import type { CacheInvalidationQueuePort } from '@/shared-kernel/cache/cache-invalidation.queue';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

const CTX = 'InvalidateMatchCacheOnJobUpdated';

export class InvalidateMatchCacheOnJobUpdatedHandler {
  constructor(
    private readonly cache: CachePort,
    private readonly fallbackQueue: CacheInvalidationQueuePort,
    private readonly logger: LoggerPort,
  ) {}

  async handle(event: JobUpdatedEvent): Promise<void> {
    const jobId = event.aggregateId;
    // Match cache key is `match:<resumeId>:<jobId>:<userId>:<rulesVersion>`
    // (see ComputeMatchUseCase). Wildcard the resumeId so every cached
    // match against this job drops at once.
    const pattern = `match:*:${jobId}:*`;
    try {
      await this.cache.deletePattern(pattern);
      this.logger.log(`Match cache invalidated for jobId=${jobId} pattern=${pattern}`, CTX);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown';
      this.logger.warn(
        `Sync match-cache invalidation failed jobId=${jobId} (${reason}); enqueuing fallback`,
        CTX,
      );
      try {
        await this.fallbackQueue.enqueue({ kind: 'invalidate-pattern', pattern });
      } catch (queueErr) {
        // Both sync AND queue are down — log loudly. Cache stays stale
        // until the next TTL expiry; we'll lose some Match accuracy
        // for at most 24h but no other code path is impacted.
        this.logger.error(
          `Match cache invalidation completely failed jobId=${jobId}: queue also failed`,
          {
            context: CTX,
            stack: queueErr instanceof Error ? queueErr.stack : undefined,
            jobId,
            originalError: reason,
          },
        );
      }
    }
  }
}
