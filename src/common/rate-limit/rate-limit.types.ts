/**
 * Rate Limit Types
 *
 * Type definitions for granular rate limiting.
 * Provides strong typing for rate limit configurations and responses.
 *
 * Uncle Bob: "Types are contracts - they document intent and prevent errors"
 */

/**
 * Rate limit context - determines which rules to apply
 */
export type RateLimitContext =
  | 'global'
  | 'authenticated'
  | 'public'
  | 'expensive'
  | 'auth';

/**
 * Rate limit key strategy - how to identify the requestor
 */
export type RateLimitKeyStrategy =
  | 'ip'
  | 'user'
  | 'ip-and-endpoint'
  | 'user-and-endpoint';

/**
 * Configuration for a single rate limit rule
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  readonly points: number;
  /** Time window in seconds */
  readonly duration: number;
  /** Resource identifier for grouping limits */
  readonly resource?: string;
  /** Key strategy to use */
  readonly keyStrategy?: RateLimitKeyStrategy;
  /** Block duration in seconds after exceeding limit */
  readonly blockDuration?: number;
}

/**
 * Rate limit configurations by context
 */
export interface RateLimitContextConfig {
  readonly global: RateLimitConfig;
  readonly authenticated: RateLimitConfig;
  readonly public: RateLimitConfig;
  readonly expensive: RateLimitConfig;
  readonly auth: RateLimitConfig;
}

/**
 * Rate limit result returned after consuming a point
 */
export interface RateLimitResult {
  /** Current remaining points */
  readonly remainingPoints: number;
  /** Milliseconds before next reset */
  readonly msBeforeNext: number;
  /** Total points consumed */
  readonly consumedPoints: number;
  /** Whether the request was blocked */
  readonly isBlocked: boolean;
}

/**
 * Rate limit response headers
 * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
 */
export interface RateLimitHeaders {
  readonly 'X-RateLimit-Limit': number;
  readonly 'X-RateLimit-Remaining': number;
  readonly 'X-RateLimit-Reset': number;
  readonly 'Retry-After'?: number;
}

/**
 * Rate limit error payload
 */
export interface RateLimitErrorPayload {
  readonly message: string;
  readonly retryAfter: number;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: number;
}

/**
 * Options for the @RateLimit decorator
 */
export interface RateLimitOptions {
  /** Number of points allowed */
  readonly points: number;
  /** Duration in seconds */
  readonly duration: number;
  /** Resource identifier */
  readonly resource?: string;
  /** Key strategy to use */
  readonly keyStrategy?: RateLimitKeyStrategy;
  /** Skip rate limiting for certain conditions */
  readonly skipIf?: (context: unknown) => boolean;
}

/**
 * Default rate limit configurations
 */
export const DEFAULT_RATE_LIMITS: RateLimitContextConfig = {
  global: { points: 100, duration: 60, keyStrategy: 'ip' },
  authenticated: { points: 1000, duration: 60, keyStrategy: 'user' },
  public: { points: 20, duration: 60, keyStrategy: 'ip' },
  expensive: { points: 5, duration: 60, keyStrategy: 'user-and-endpoint' },
  auth: { points: 10, duration: 900, keyStrategy: 'ip', blockDuration: 900 }, // 15 min window
} as const;
