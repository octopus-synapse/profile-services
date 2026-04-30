/**
 * Metadata key kept after the Nest `RateLimitGuard` was deleted in the
 * Phase-2 cutover. Routes use it as a stable identifier for the
 * Elysia pipeline's `rateLimit` stage (see
 * `infrastructure/elysia-adapter/cache-rate-limit.adapter.ts`).
 */

export const RATE_LIMIT_KEY = 'rate-limit';
