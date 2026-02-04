import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { createHash } from 'crypto';
import type { AnalyticsEvent } from '@prisma/client';

interface TrackEvent {
  shareId: string;
  event: AnalyticsEvent;
  ip: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
}

@Injectable()
export class ShareAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async trackEvent(dto: TrackEvent) {
    // Anonymize IP (GDPR compliance)
    const ipHash = this.anonymizeIP(dto.ip);

    return this.prisma.shareAnalytics.create({
      data: {
        shareId: dto.shareId,
        event: dto.event,
        ipHash,
        userAgent: dto.userAgent,
        referer: dto.referer,
        country: dto.country,
        city: dto.city,
      },
    });
  }

  async getAnalytics(shareId: string, userId: string) {
    // Verify ownership
    const share = await this.prisma.resumeShare.findUnique({
      where: { id: shareId },
      include: { resume: { select: { userId: true } } },
    });

    if (!share) {
      throw new ForbiddenException('Share not found');
    }

    if (share.resume.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Get event counts
    const analytics = await this.prisma.shareAnalytics.groupBy({
      by: ['event'],
      where: { shareId },
      _count: { event: true },
    });

    // Get unique views (unique IP hashes)
    const uniqueViews = await this.prisma.shareAnalytics.groupBy({
      by: ['ipHash'],
      where: { shareId, event: 'VIEW' },
      _count: { ipHash: true },
    });

    // Get geo data
    const byCountry = await this.prisma.shareAnalytics.groupBy({
      by: ['country'],
      where: { shareId, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    });

    // Recent events
    const recentEvents = await this.prisma.shareAnalytics.findMany({
      where: { shareId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        event: true,
        country: true,
        city: true,
        createdAt: true,
      },
    });

    return {
      shareId,
      totalViews: analytics.find((a) => a.event === 'VIEW')?._count.event ?? 0,
      totalDownloads:
        analytics.find((a) => a.event === 'DOWNLOAD')?._count.event ?? 0,
      uniqueVisitors: uniqueViews.length,
      byCountry: byCountry.map((c) => ({
        country: c.country,
        count: c._count.country,
      })),
      recentEvents,
    };
  }

  async getEvents(
    shareId: string,
    userId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      eventType?: 'VIEW' | 'DOWNLOAD';
    },
  ) {
    // Verify ownership
    const share = await this.prisma.resumeShare.findUnique({
      where: { id: shareId },
      include: { resume: { select: { userId: true } } },
    });

    if (!share) {
      throw new ForbiddenException('Share not found');
    }

    if (share.resume.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const where: {
      shareId: string;
      createdAt?: { gte?: Date; lte?: Date };
      event?: 'VIEW' | 'DOWNLOAD';
    } = { shareId };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters?.eventType) {
      where.event = filters.eventType;
    }

    const events = await this.prisma.shareAnalytics.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        event: true,
        ipHash: true,
        userAgent: true,
        referer: true,
        country: true,
        city: true,
        createdAt: true,
      },
    });

    return events.map((event) => ({
      eventType: event.event,
      ipAddress: event.ipHash,
      userAgent: event.userAgent,
      referrer: event.referer,
      country: event.country,
      city: event.city,
      createdAt: event.createdAt,
    }));
  }

  private anonymizeIP(ip: string): string {
    // SHA-256 hash for anonymization
    return createHash('sha256').update(ip).digest('hex');
  }
}
