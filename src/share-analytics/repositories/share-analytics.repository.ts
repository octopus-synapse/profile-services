/**
 * Share Analytics Repository
 * Data access layer for share analytics operations
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  AnalyticsEvent,
  ShareAnalytics,
  ResumeShare,
} from '@prisma/client';

interface CreateAnalyticsEvent {
  shareId: string;
  event: AnalyticsEvent;
  ipHash: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
}

type EventCount = {
  event: AnalyticsEvent;
  _count: { event: number };
};

type UniqueView = {
  ipHash: string;
  _count: { ipHash: number };
};

type CountryCount = {
  country: string | null;
  _count: { country: number };
};

@Injectable()
export class ShareAnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an analytics event
   */
  async createEvent(data: CreateAnalyticsEvent): Promise<ShareAnalytics> {
    return this.prisma.shareAnalytics.create({ data });
  }

  /**
   * Find a resume share by ID with resume owner
   */
  async findShareWithOwner(
    shareId: string,
  ): Promise<(ResumeShare & { resume: { userId: string } }) | null> {
    return this.prisma.resumeShare.findUnique({
      where: { id: shareId },
      include: { resume: { select: { userId: true } } },
    });
  }

  /**
   * Get event counts grouped by event type
   */
  async getEventCounts(shareId: string): Promise<EventCount[]> {
    const results = await this.prisma.shareAnalytics.groupBy({
      by: ['event'],
      where: { shareId },
      _count: { event: true },
    });
    return results;
  }

  /**
   * Get unique views (unique IP hashes)
   */
  async getUniqueViews(shareId: string): Promise<UniqueView[]> {
    const results = await this.prisma.shareAnalytics.groupBy({
      by: ['ipHash'],
      where: { shareId, event: 'VIEW' },
      _count: { ipHash: true },
    });
    return results;
  }

  /**
   * Get analytics grouped by country
   */
  async getByCountry(
    shareId: string,
    limit: number = 10,
  ): Promise<CountryCount[]> {
    const results = await this.prisma.shareAnalytics.groupBy({
      by: ['country'],
      where: { shareId, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: limit,
    });
    return results;
  }

  /**
   * Get recent events for a share
   */
  async getRecentEvents(
    shareId: string,
    limit: number = 20,
  ): Promise<
    Array<{
      event: AnalyticsEvent;
      country: string | null;
      city: string | null;
      createdAt: Date;
    }>
  > {
    return this.prisma.shareAnalytics.findMany({
      where: { shareId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        event: true,
        country: true,
        city: true,
        createdAt: true,
      },
    });
  }

  /**
   * Find events with filters
   */
  async findEvents(
    shareId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      eventType?: 'VIEW' | 'DOWNLOAD';
    },
  ): Promise<
    Array<{
      event: AnalyticsEvent;
      ipHash: string;
      userAgent: string | null;
      referer: string | null;
      country: string | null;
      city: string | null;
      createdAt: Date;
    }>
  > {
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

    return this.prisma.shareAnalytics.findMany({
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
  }
}
