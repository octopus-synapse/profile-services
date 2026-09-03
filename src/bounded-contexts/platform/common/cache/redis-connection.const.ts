/**
 * Redis connection defaults, shared by every client this service opens.
 *
 * The cache connection and the feature-flag connection each declared the
 * same port, the same backoff and the same multiplier. They are the same
 * Redis and the same operational decision: a flag lookup that gives up on a
 * different schedule than a cache read is a bug waiting for an incident, not
 * a feature.
 */

/** Redis' own default, used when `REDIS_PORT` is unset. */
export const REDIS_DEFAULT_PORT = 6379;

/** Backoff grows by this many milliseconds per attempt… */
export const REDIS_RETRY_DELAY_MULTIPLIER_MS = 50;

/** …and stops growing here. */
export const REDIS_RETRY_DELAY_MAX_MS = 2000;

/** How many times one command retries before it fails to the caller. */
export const REDIS_MAX_RETRIES_PER_REQUEST = 3;

/** `times → delay` for ioredis, from the two values above. */
export function redisRetryStrategy(times: number): number {
  return Math.min(times * REDIS_RETRY_DELAY_MULTIPLIER_MS, REDIS_RETRY_DELAY_MAX_MS);
}
