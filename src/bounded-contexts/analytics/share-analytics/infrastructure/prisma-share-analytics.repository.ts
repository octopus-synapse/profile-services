/**
 * Prisma Share Analytics Repository
 *
 * Production implementation of ShareAnalyticsRepositoryPort using Prisma.
 * Handles all database operations for share analytics.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type {
  CountryResult,
  CreateShareAnalyticsData,
  DetailedEventResult,
  DeviceTypeResult,
  EventCountResult,
  EventFilters,
  RecentEventResult,
  ShareAnalyticsRecord,
  ShareAnalyticsRepositoryPort,
  ShareWithOwner,
  UniqueViewResult,
} from '../ports';

@Injectable()
export class PrismaShareAnalyticsRepository implements ShareAnalyticsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateShareAnalyticsData): Promise<ShareAnalyticsRecord> {
    return this.prisma.shareAnalytics.create({
      data: {
        shareId: data.shareId,
        event: data.event,
        ipHash: data.ipHash,
        userAgent: data.userAgent,
        referer: data.referer,
        country: data.country,
        city: data.city,
        deviceType: data.deviceType,
        browser: data.browser,
        os: data.os,
      },
    });
  }

  async findShareWithOwner(shareId: string): Promise<ShareWithOwner | null> {
    return this.prisma.resumeShare.findUnique({
      where: { id: shareId },
      include: { resume: { select: { userId: true } } },
    });
  }

  async groupByEvent(shareId: string): Promise<EventCountResult[]> {
    const results = await this.prisma.shareAnalytics.groupBy({
      by: ['event'],
      where: { shareId },
      _count: { event: true },
    });

    return results as EventCountResult[];
  }

  async groupByIpHash(shareId: string): Promise<UniqueViewResult[]> {
    const results = await this.prisma.shareAnalytics.groupBy({
      by: ['ipHash'],
      where: { shareId, event: 'VIEW' },
      _count: { ipHash: true },
    });

    return results as UniqueViewResult[];
  }

  async groupByDeviceType(shareId: string): Promise<DeviceTypeResult[]> {
    const results = await this.prisma.shareAnalytics.groupBy({
      by: ['deviceType'],
      where: { shareId },
      _count: { deviceType: true },
      orderBy: { _count: { deviceType: 'desc' } },
    });

    return results as DeviceTypeResult[];
  }

  async groupByCountry(shareId: string, limit: number): Promise<CountryResult[]> {
    const results = await this.prisma.shareAnalytics.groupBy({
      by: ['country'],
      where: { shareId, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: limit,
    });

    return results as CountryResult[];
  }

  async getRecentEvents(shareId: string, limit: number): Promise<RecentEventResult[]> {
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

  async getDetailedEvents(shareId: string, filters?: EventFilters): Promise<DetailedEventResult[]> {
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
        deviceType: true,
        browser: true,
        os: true,
        createdAt: true,
      },
    });
  }
}
