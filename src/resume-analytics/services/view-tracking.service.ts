/**
 * View Tracking Service
 *
 * Handles resume view tracking with GDPR-compliant IP anonymization.
 *
 * Extracted from ResumeAnalyticsService as part of god class decomposition.
 * @see ADR-000X — Enforce Disciplined, Persona-Aware Engineering
 */

import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { AnalyticsRepository } from '../repositories';
import type { TrackView, ViewStats, ViewStatsOptions } from '../interfaces';

const TRAFFIC_SOURCES: Record<string, string> = {
  linkedin: 'linkedin',
  github: 'github',
  google: 'google',
  twitter: 'twitter',
  facebook: 'facebook',
  instagram: 'instagram',
  indeed: 'indeed',
  glassdoor: 'glassdoor',
};

@Injectable()
export class ViewTrackingService {
  constructor(private readonly repository: AnalyticsRepository) {}

  /**
   * Track a resume view event with GDPR-compliant IP anonymization
   */
  async trackView(dto: TrackView): Promise<void> {
    const ipHash = this.anonymizeIP(dto.ip);
    const source = this.detectSource(dto.referer);

    await this.repository.createViewEvent({
      resumeId: dto.resumeId,
      ipHash,
      userAgent: dto.userAgent,
      referer: dto.referer,
      country: dto.country,
      city: dto.city,
      source,
    });
  }

  /**
   * Get view statistics for a resume within a time period
   */
  async getViewStats(
    resumeId: string,
    options: ViewStatsOptions | { period: 'day' | 'week' | 'month' | 'year' },
  ): Promise<ViewStats> {
    const { startDate, endDate } = this.getDateRange(options.period);
    const dateRange = { startDate, endDate };

    const totalViews = await this.repository.countViewEvents(
      resumeId,
      dateRange,
    );

    const uniqueVisitors = await this.repository.groupViewEventsByIpHash(
      resumeId,
      dateRange,
    );

    const viewsByDay = await this.getViewsByDay(resumeId, startDate, endDate);
    const topSources = await this.getTopSources(resumeId, startDate, endDate);

    return {
      totalViews,
      uniqueVisitors: uniqueVisitors.length,
      viewsByDay,
      topSources,
    };
  }

  /**
   * Get total views count for a resume
   */
  async getTotalViews(resumeId: string): Promise<number> {
    return this.repository.countViewEvents(resumeId);
  }

  /**
   * Get unique visitors count for a resume
   */
  async getUniqueVisitors(resumeId: string): Promise<number> {
    const visitors = await this.repository.groupViewEventsByIpHash(resumeId);
    return visitors.length;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * GDPR-compliant IP anonymization using SHA-256 hash
   */
  private anonymizeIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }

  /**
   * Detect traffic source from referer URL
   */
  private detectSource(referer?: string): string {
    if (!referer) return 'direct';

    const refererLower = referer.toLowerCase();
    for (const [domain, source] of Object.entries(TRAFFIC_SOURCES)) {
      if (refererLower.includes(domain)) {
        return source;
      }
    }

    return 'other';
  }

  /**
   * Calculate date range based on period
   */
  private getDateRange(period: 'day' | 'week' | 'month' | 'year'): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Get views grouped by day
   */
  private async getViewsByDay(
    resumeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    const views = await this.repository.findViewEventsForDateRange(resumeId, {
      startDate,
      endDate,
    });

    const countByDay = new Map<string, number>();
    for (const view of views) {
      const dateKey = view.createdAt.toISOString().split('T')[0];
      countByDay.set(dateKey, (countByDay.get(dateKey) ?? 0) + 1);
    }

    return Array.from(countByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get top traffic sources
   */
  private async getTopSources(
    resumeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ source: string; count: number; percentage: number }>> {
    const sources = await this.repository.groupViewEventsBySource(resumeId, {
      startDate,
      endDate,
    });

    // Filter valid source records (must have _count.source)
    const validSources = sources.filter(
      (s): s is typeof s & { _count: { source: number } } =>
        'source' in s._count && typeof s._count.source === 'number',
    );

    const total = validSources.reduce((sum, s) => sum + s._count.source, 0);

    return validSources.map((s) => ({
      source: s.source || 'direct',
      count: s._count.source,
      percentage: total > 0 ? Math.round((s._count.source / total) * 100) : 0,
    }));
  }
}
