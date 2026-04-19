import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_EVENT_BUS_PORT,
  AnalyticsEventBusPort,
} from '../application/ports/analytics-event-bus.port';
import { ViewTrackingRepositoryPort } from '../application/ports/resume-analytics.port';
import { TRAFFIC_SOURCES } from '../domain/value-objects/traffic-sources';
import type { TrackView, ViewStats, ViewStatsOptions } from '../interfaces';

@Injectable()
export class ViewTrackingService {
  constructor(
    private readonly repository: ViewTrackingRepositoryPort,
    @Inject(ANALYTICS_EVENT_BUS_PORT)
    private readonly eventBus: AnalyticsEventBusPort,
  ) {}

  async trackView(dto: TrackView): Promise<void> {
    const ipHash = this.anonymizeIP(dto.ip);
    const source = this.detectSource(dto.referer);

    await this.repository.trackView({
      resumeId: dto.resumeId,
      ipHash,
      userAgent: dto.userAgent,
      referer: dto.referer,
      country: dto.country,
      city: dto.city,
      source,
    });

    const now = new Date();
    const totalViews = await this.repository.countViews(dto.resumeId, new Date(0), now);

    this.eventBus.emit(`analytics:${dto.resumeId}:view`, {
      type: 'view',
      resumeId: dto.resumeId,
      data: {
        views: totalViews,
        timestamp: now,
      },
    });
  }

  async getViewStats(resumeId: string, options: ViewStatsOptions): Promise<ViewStats> {
    const { startDate, endDate } = this.getDateRange(options.period);

    const [totalViews, uniqueVisitors] = await Promise.all([
      this.repository.countViews(resumeId, startDate, endDate),
      this.repository.countUniqueVisitors(resumeId, startDate, endDate),
    ]);

    return {
      totalViews,
      uniqueVisitors,
      viewsByDay: [],
      topSources: [],
    };
  }

  private anonymizeIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }

  private detectSource(referer?: string): string {
    if (!referer) return 'direct';
    const refererLower = referer.toLowerCase();
    for (const [domain, source] of Object.entries(TRAFFIC_SOURCES)) {
      if (refererLower.includes(domain)) return source;
    }
    return 'other';
  }

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
}
