/**
 * Rate Limit Service
 *
 * Provides granular rate limiting using sliding window algorithm.
 * Supports multiple key strategies and context-aware limits.
 *
 * Uncle Bob: "Services should have a single, clear responsibility"
 * Kent Beck: "Make it work, make it right, make it fast"
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import {
  DEFAULT_RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitHeaders,
  type RateLimitKeyStrategy,
  type RateLimitResult,
} from './rate-limit.types';

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

interface GenerateKeyParams {
  keyStrategy: RateLimitKeyStrategy;
  ip?: string;
  userId?: string;
  endpoint?: string;
}

interface ContextParams {
  isAuthenticated: boolean;
  isAuthEndpoint?: boolean;
  isExpensiveOperation?: boolean;
}

@Injectable()
export class RateLimitService {
  private readonly RATE_LIMIT_PREFIX = 'ratelimit';

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Generates a rate limit key based on the strategy.
   * Falls back to IP when user is not available.
   */
  generateKey(params: GenerateKeyParams): string {
    const { keyStrategy, ip, userId, endpoint } = params;

    switch (keyStrategy) {
      case 'ip':
        return `${this.RATE_LIMIT_PREFIX}:ip:${ip}`;

      case 'user':
        if (userId) {
          return `${this.RATE_LIMIT_PREFIX}:user:${userId}`;
        }
        return `${this.RATE_LIMIT_PREFIX}:ip:${ip}`;

      case 'ip-and-endpoint':
        return `${this.RATE_LIMIT_PREFIX}:ip:${ip}:${endpoint}`;

      case 'user-and-endpoint':
        if (userId) {
          return `${this.RATE_LIMIT_PREFIX}:user:${userId}:${endpoint}`;
        }
        return `${this.RATE_LIMIT_PREFIX}:ip:${ip}:${endpoint}`;

      default:
        return `${this.RATE_LIMIT_PREFIX}:ip:${ip}`;
    }
  }

  /**
   * Consumes a rate limit point for the given key.
   * Returns the result including whether the request is blocked.
   */
  async consume(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const { points, duration } = config;
    const now = Date.now();
    const windowEnd = now + duration * 1000;

    const entry = await this.cacheService.get<RateLimitEntry>(key);

    // Window expired or no entry - start fresh
    if (!entry || entry.expiresAt < now) {
      const newEntry: RateLimitEntry = {
        count: 1,
        expiresAt: windowEnd,
      };
      await this.cacheService.set(key, newEntry, duration);

      return {
        remainingPoints: points - 1,
        msBeforeNext: duration * 1000,
        consumedPoints: 1,
        isBlocked: false,
      };
    }

    // Already at or over limit
    if (entry.count >= points) {
      return {
        remainingPoints: 0,
        msBeforeNext: entry.expiresAt - now,
        consumedPoints: entry.count,
        isBlocked: true,
      };
    }

    // Increment counter
    const newCount = entry.count + 1;
    const updatedEntry: RateLimitEntry = {
      count: newCount,
      expiresAt: entry.expiresAt,
    };
    const remainingTtl = Math.ceil((entry.expiresAt - now) / 1000);
    await this.cacheService.set(key, updatedEntry, remainingTtl);

    return {
      remainingPoints: points - newCount,
      msBeforeNext: entry.expiresAt - now,
      consumedPoints: newCount,
      isBlocked: false,
    };
  }

  /**
   * Generates standard rate limit headers for the response.
   * @see https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/
   */
  getHeaders(result: RateLimitResult, config: RateLimitConfig): RateLimitHeaders {
    const resetTimestamp = Math.floor((Date.now() + result.msBeforeNext) / 1000);

    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': config.points,
      'X-RateLimit-Remaining': result.remainingPoints,
      'X-RateLimit-Reset': resetTimestamp,
    };

    if (result.isBlocked) {
      return {
        ...headers,
        'Retry-After': Math.ceil(result.msBeforeNext / 1000),
      };
    }

    return headers;
  }

  /**
   * Returns the appropriate rate limit config based on context.
   */
  getContextConfig(params: ContextParams): RateLimitConfig {
    const { isAuthenticated, isAuthEndpoint, isExpensiveOperation } = params;

    // Auth endpoints have stricter limits
    if (isAuthEndpoint) {
      return DEFAULT_RATE_LIMITS.auth;
    }

    // Expensive operations have very strict limits
    if (isExpensiveOperation) {
      return DEFAULT_RATE_LIMITS.expensive;
    }

    // Authenticated users get higher limits
    if (isAuthenticated) {
      return DEFAULT_RATE_LIMITS.authenticated;
    }

    // Default for unauthenticated requests
    return DEFAULT_RATE_LIMITS.global;
  }

  /**
   * Checks if a key is currently blocked without consuming a point.
   */
  async isBlocked(key: string, config: RateLimitConfig): Promise<boolean> {
    const entry = await this.cacheService.get<RateLimitEntry>(key);

    if (!entry) {
      return false;
    }

    // Window expired
    if (entry.expiresAt < Date.now()) {
      return false;
    }

    return entry.count >= config.points;
  }

  /**
   * Resets the rate limit counter for a key.
   */
  async reset(key: string): Promise<void> {
    const entry: RateLimitEntry = {
      count: 0,
      expiresAt: Date.now() + 60000,
    };
    await this.cacheService.set(key, entry, 60);
  }
}
