/**
 * Cache Invalidation Service
 *
 * Provides high-level cache invalidation strategies for common entities.
 * Centralizes invalidation logic to ensure consistency across the application.
 *
 * Kent Beck: "Centralize knowledge to reduce duplication."
 */

import type { CachePort } from '@/shared-kernel/cache/cache.port';
import {
  CacheInvalidationPort,
  type InvalidateResumeInput,
} from '@/shared-kernel/cache/cache-invalidation.port';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

// --- Types ---

/**
 * @deprecated Use `InvalidateResumeInput` from shared-kernel/cache.
 * @removeBy 2026-08-31
 */
export type InvalidateResumeParams = InvalidateResumeInput;

// --- Service ---

export class CacheInvalidationService extends CacheInvalidationPort {
  constructor(
    private readonly cache: CachePort,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  /**
   * Invalidate all cache entries related to a resume.
   * Call this after any resume mutation (create, update, delete).
   */
  async invalidateResume(params: InvalidateResumeInput): Promise<void> {
    const { resumeId, slug, userId } = params;

    const operations: Promise<void>[] = [
      this.safeDelete(`resume:${resumeId}`),
      this.safeDelete(`user:${userId}:resumes`),
      this.safeDeletePattern(`analytics:*:${resumeId}`),
      // Public resume cache uses resumeId as key
      this.safeDelete(`public:resume:${resumeId}`),
    ];

    // Also invalidate by slug if available
    if (slug) {
      operations.push(this.safeDelete(`public:resume:${slug}`));
    }

    await Promise.all(operations);

    this.logger.debug(`Cache invalidated for resume: ${resumeId}`, 'CacheInvalidationService');
  }

  /**
   * Invalidate all cache entries related to a user.
   * Call this after user profile/preferences mutations.
   */
  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.safeDelete(`user:${userId}:profile`),
      this.safeDelete(`user:${userId}:preferences`),
      this.safeDeletePattern(`user:${userId}:*`),
    ]);

    this.logger.debug(`Cache invalidated for user: ${userId}`, 'CacheInvalidationService');
  }

  /** Drop every cache entry under a key prefix. */
  async invalidatePrefix(prefix: string): Promise<void> {
    await this.safeDeletePattern(`${prefix}*`);
    this.logger.debug(`Cache invalidated for prefix: ${prefix}`, 'CacheInvalidationService');
  }

  /**
   * Invalidate analytics cache for a specific entity.
   */
  async invalidateAnalytics(entityType: string, entityId: string): Promise<void> {
    await Promise.all([
      this.safeDeletePattern(`analytics:${entityType}:${entityId}:*`),
      this.safeDelete(`analytics:dashboard:${entityId}`),
    ]);

    this.logger.debug(
      `Analytics cache invalidated for ${entityType}: ${entityId}`,
      'CacheInvalidationService',
    );
  }

  /**
   * Invalidate public resume listings cache.
   * Call this when resume visibility changes or new public resumes are created.
   */
  async invalidatePublicResumes(): Promise<void> {
    await this.safeDeletePattern('public:resumes:*');

    this.logger.debug('Public resumes cache invalidated', 'CacheInvalidationService');
  }

  /**
   * Invalidate entire cache.
   * Use sparingly - typically for admin operations or deployments.
   */
  async invalidateAll(): Promise<void> {
    this.logger.warn('Flushing entire cache', 'CacheInvalidationService');
    await this.cache.flush();
  }

  /**
   * Invalidate specific cache keys.
   */
  async invalidateKeys(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    await Promise.all(keys.map((key) => this.safeDelete(key)));

    this.logger.debug(`Invalidated ${keys.length} cache keys`, 'CacheInvalidationService');
  }

  /**
   * Invalidate cache keys matching patterns.
   */
  async invalidatePatterns(patterns: string[]): Promise<void> {
    if (patterns.length === 0) return;

    await Promise.all(patterns.map((pattern) => this.safeDeletePattern(pattern)));

    this.logger.debug(`Invalidated ${patterns.length} cache patterns`, 'CacheInvalidationService');
  }

  // --- Private Helpers ---

  private async safeDelete(key: string): Promise<void> {
    try {
      await this.cache.delete(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key: ${key}`, {
        context: 'CacheInvalidationService',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  private async safeDeletePattern(pattern: string): Promise<void> {
    try {
      await this.cache.deletePattern(pattern);
    } catch (error) {
      this.logger.error(`Failed to delete cache pattern: ${pattern}`, {
        context: 'CacheInvalidationService',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }
}
