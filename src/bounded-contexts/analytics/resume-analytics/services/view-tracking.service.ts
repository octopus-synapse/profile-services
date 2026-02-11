import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { TRAFFIC_SOURCES } from '../domain/value-objects/traffic-sources';
import type { TrackView, ViewStats, ViewStatsOptions } from '../interfaces';

@Injectable()
export class ViewTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async trackView(dto: TrackView): Promise<void> {
    const ipHash = this.anonymizeIP(dto.ip);
    const source = this.detectSource(dto.referer);

    await this.prisma.resumeViewEvent.create({
      data: {
        resumeId: dto.resumeId,
        ipHash,
        userAgent: dto.userAgent,
        referer: dto.referer,
        country: dto.country,
        city: dto.city,
        source,
      },
    });

    // Emit SSE event with updated view count
    const totalViews = await this.prisma.resumeViewEvent.count({
      where: { resumeId: dto.resumeId },
    });

    this.eventEmitter.emit(`analytics:${dto.resumeId}:view`, {
      type: 'view',
      resumeId: dto.resumeId,
      data: {
        views: totalViews,
        timestamp: new Date(),
      },
    });
  }

  async getViewStats(resumeId: string, options: ViewStatsOptions): Promise<ViewStats> {
    const { startDate, endDate } = this.getDateRange(options.period);

    const [totalViews, uniqueVisitors] = await Promise.all([
      this.prisma.resumeViewEvent.count({
        where: { resumeId, createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.resumeViewEvent.groupBy({
        by: ['ipHash'],
        where: { resumeId, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    return {
      totalViews,
      uniqueVisitors: uniqueVisitors.length,
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
