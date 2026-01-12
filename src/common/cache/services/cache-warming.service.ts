/**
 * Cache Warming Service
 *
 * Pre-populates cache with frequently accessed data to improve performance.
 * Can be triggered on application startup or via scheduled jobs.
 *
 * Kent Beck: "Optimize later. First make it work, then make it fast."
 */

import { Injectable } from '@nestjs/common';
import { CacheService } from '../cache.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppLoggerService } from '../../logger/logger.service';

// --- Types ---

interface WarmingStats {
  lastWarmTime: Date | null;
  itemsWarmed: number;
  errors: number;
}

// --- Cache TTL Constants ---

const CACHE_TTL = {
  POPULAR_RESUME: 3600, // 1 hour
  PUBLIC_RESUME: 300, // 5 minutes
  USER_PROFILE: 120, // 2 minutes
} as const;

// --- Service ---

@Injectable()
export class CacheWarmingService {
  private stats: WarmingStats = {
    lastWarmTime: null,
    itemsWarmed: 0,
    errors: 0,
  };

  constructor(
    private readonly cache: CacheService,
    private readonly prisma: PrismaService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Warm cache with most popular public resumes.
   * These are frequently accessed and benefit most from caching.
   */
  async warmPopularResumes(limit = 100): Promise<void> {
    try {
      const resumes = await this.prisma.resume.findMany({
        where: { isPublic: true },
        orderBy: { profileViews: 'desc' },
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          fullName: true,
          jobTitle: true,
          summary: true,
          profileViews: true,
          primaryLanguage: true,
          accentColor: true,
          template: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      let warmed = 0;
      for (const resume of resumes) {
        if (resume.slug) {
          try {
            await this.cache.set(
              `public:resume:${resume.slug}`,
              resume,
              CACHE_TTL.POPULAR_RESUME,
            );
            warmed++;
          } catch {
            this.stats.errors++;
          }
        }
      }

      this.stats.itemsWarmed += warmed;
      this.stats.lastWarmTime = new Date();

      this.logger.log(
        `Warmed ${warmed} popular resumes`,
        'CacheWarmingService',
      );
    } catch (error) {
      this.stats.errors++;
      this.logger.error(
        'Failed to warm popular resumes cache',
        error instanceof Error ? error.stack : undefined,
        'CacheWarmingService',
      );
    }
  }

  /**
   * Warm cache for a specific resume by slug.
   * Useful after resume updates to immediately cache the new data.
   */
  async warmResumeBySlug(slug: string): Promise<void> {
    try {
      const resume = await this.prisma.resume.findUnique({
        where: { slug, isPublic: true },
        select: {
          id: true,
          slug: true,
          title: true,
          fullName: true,
          jobTitle: true,
          summary: true,
          profileViews: true,
          primaryLanguage: true,
          accentColor: true,
          template: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (resume) {
        await this.cache.set(
          `public:resume:${slug}`,
          resume,
          CACHE_TTL.PUBLIC_RESUME,
        );
        this.stats.itemsWarmed++;
        this.logger.debug(
          `Warmed cache for resume: ${slug}`,
          'CacheWarmingService',
        );
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error(
        `Failed to warm cache for resume: ${slug}`,
        error instanceof Error ? error.stack : undefined,
        'CacheWarmingService',
      );
    }
  }

  /**
   * Warm user profile and preferences cache.
   */
  async warmUserProfile(userId: string): Promise<void> {
    try {
      const users = await this.prisma.user.findMany({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          preferences: true,
        },
        take: 1,
      });

      const user = users[0];
      if (user) {
        await this.cache.set(
          `user:${userId}:profile`,
          user,
          CACHE_TTL.USER_PROFILE,
        );

        if (user.preferences) {
          await this.cache.set(
            `user:${userId}:preferences`,
            user.preferences,
            CACHE_TTL.USER_PROFILE,
          );
        }

        this.stats.itemsWarmed++;
        this.logger.debug(
          `Warmed cache for user: ${userId}`,
          'CacheWarmingService',
        );
      }
    } catch (error) {
      this.stats.errors++;
      this.logger.error(
        `Failed to warm cache for user: ${userId}`,
        error instanceof Error ? error.stack : undefined,
        'CacheWarmingService',
      );
    }
  }

  /**
   * Warm all cache categories.
   * Typically called on application startup or via cron job.
   */
  async warmAll(): Promise<void> {
    this.logger.log('Starting cache warming...', 'CacheWarmingService');

    const startTime = Date.now();

    await this.warmPopularResumes(100);

    const duration = Date.now() - startTime;
    this.logger.log(
      `Cache warming completed in ${duration}ms`,
      'CacheWarmingService',
    );
  }

  /**
   * Get warming statistics for monitoring.
   */
  getWarmingStats(): WarmingStats {
    return { ...this.stats };
  }

  /**
   * Reset warming statistics.
   */
  resetStats(): void {
    this.stats = {
      lastWarmTime: null,
      itemsWarmed: 0,
      errors: 0,
    };
  }
}
