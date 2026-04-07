/**
 * Prisma View Tracking Repository
 *
 * Persistence for resume view events.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { ViewTrackingRepositoryPort } from '../../../application/ports/resume-analytics.port';

export class PrismaViewTrackingRepository implements ViewTrackingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async trackView(data: {
    resumeId: string;
    ipHash: string;
    userAgent?: string;
    referer?: string;
    country?: string;
    city?: string;
    source: string;
  }): Promise<void> {
    await this.prisma.resumeViewEvent.create({
      data: {
        resumeId: data.resumeId,
        ipHash: data.ipHash,
        userAgent: data.userAgent,
        referer: data.referer,
        country: data.country,
        city: data.city,
        source: data.source,
      },
    });
  }

  async countViews(resumeId: string, startDate: Date, endDate: Date): Promise<number> {
    return this.prisma.resumeViewEvent.count({
      where: { resumeId, createdAt: { gte: startDate, lte: endDate } },
    });
  }

  async countUniqueVisitors(resumeId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await this.prisma.resumeViewEvent.groupBy({
      by: ['ipHash'],
      where: { resumeId, createdAt: { gte: startDate, lte: endDate } },
    });
    return result.length;
  }
}
