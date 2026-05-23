/**
 * Generic cache-invalidation queue contract (P0-017).
 *
 * `JobUpdatedEvent` (and any future event that needs cache invalidation)
 * uses this queue as a fallback when an inline / synchronous invalidation
 * call fails — for example, when Redis blips and `cache.deletePattern`
 * throws. Without the fallback, a transient Redis error during the
 * sync path would leave the cache permanently stale until the next
 * mutation.
 *
 * The contract is queue-shaped so consumers can pick a real BullMQ
 * adapter (production) or an in-memory adapter (tests). The default
 * BullMQ adapter is `BullMQCacheInvalidationAdapter` registered in the
 * Elysia bootstrap.
 *
 * Job payload format:
 *   { kind: 'invalidate-key', key: string }       → delete one key
 *   { kind: 'invalidate-pattern', pattern: string } → deletePattern (Redis glob)
 */

export type CacheInvalidationJob =
  | { readonly kind: 'invalidate-key'; readonly key: string }
  | { readonly kind: 'invalidate-pattern'; readonly pattern: string };

export abstract class CacheInvalidationQueuePort {
  abstract enqueue(job: CacheInvalidationJob): Promise<void>;
}
