/**
 * Share Analytics Service
 *
 * Business logic for tracking and analyzing resume share analytics.
 * Uses repository port for data access (clean architecture).
 *
 * Features:
 * - Event tracking (VIEW, DOWNLOAD)
 * - IP anonymization (GDPR compliance)
 * - Analytics aggregation
 * - Geo tracking
 */

import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { AnalyticsEvent } from '@prisma/client';
import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import { parseUserAgent } from '../application/utils/parse-user-agent';
import { SHARE_ANALYTICS_REPOSITORY, type ShareAnalyticsRepositoryPort } from '../ports';
import { GEO_LOOKUP_PORT, type GeoLookupPort } from '../ports/geo-lookup.port';

interface TrackEvent {
  shareId: string;
  event: AnalyticsEvent;
  ip: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
}

@Injectable()
export class ShareAnalyticsService {
  constructor(
    @Inject(SHARE_ANALYTICS_REPOSITORY)
    private readonly repository: ShareAnalyticsRepositoryPort,
    @Inject(GEO_LOOKUP_PORT)
    private readonly geoLookup: GeoLookupPort,
  ) {}

  async trackEvent(dto: TrackEvent) {
    // Anonymize IP (GDPR compliance)
    const ipHash = this.anonymizeIP(dto.ip);
    const parsed = parseUserAgent(dto.userAgent);

    let country = dto.country;
    let city = dto.city;
    if (country === undefined || city === undefined) {
      const geo = await this.geoLookup.lookup(dto.ip);
      if (geo) {
        country ??= geo.country ?? undefined;
        city ??= geo.city ?? undefined;
      }
    }

    return this.repository.create({
      shareId: dto.shareId,
      event: dto.event,
      ipHash,
      userAgent: dto.userAgent,
      referer: dto.referer,
      country,
      city,
      deviceType:
        dto.deviceType ?? (parsed.deviceType === 'unknown' ? undefined : parsed.deviceType),
      browser: dto.browser ?? parsed.browser ?? undefined,
      os: dto.os ?? parsed.os ?? undefined,
    });
  }

  async getAnalytics(shareId: string, userId: string) {
    // Verify ownership
    const share = await this.repository.findShareWithOwner(shareId);

    if (!share) {
      throw new EntityNotFoundException('Share', shareId);
    }

    if (share.resume.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    // Get event counts
    const analytics = await this.repository.groupByEvent(shareId);

    // Get unique views (unique IP hashes)
    const uniqueViews = await this.repository.groupByIpHash(shareId);

    // Get geo data
    const byCountry = await this.repository.groupByCountry(shareId, 10);

    // Device/browser breakdown
    const byDeviceType = await this.repository.groupByDeviceType(shareId);

    // Recent events
    const recentEvents = await this.repository.getRecentEvents(shareId, 20);

    return {
      shareId,
      totalViews: analytics.find((a) => a.event === 'VIEW')?._count.event ?? 0,
      totalDownloads: analytics.find((a) => a.event === 'DOWNLOAD')?._count.event ?? 0,
      uniqueVisitors: uniqueViews.length,
      byCountry: byCountry.map((c) => ({
        country: c.country,
        count: c._count.country,
      })),
      byDeviceType: byDeviceType.map((d) => ({
        deviceType: d.deviceType,
        count: d._count.deviceType,
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
    const share = await this.repository.findShareWithOwner(shareId);

    if (!share) {
      throw new EntityNotFoundException('Share', shareId);
    }

    if (share.resume.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const events = await this.repository.getDetailedEvents(shareId, filters);

    return events.map((event) => ({
      eventType: event.event,
      ipAddress: event.ipHash,
      userAgent: event.userAgent,
      referrer: event.referer,
      country: event.country,
      city: event.city,
      deviceType: event.deviceType,
      browser: event.browser,
      os: event.os,
      createdAt: event.createdAt,
    }));
  }

  private anonymizeIP(ip: string): string {
    // SHA-256 hash for anonymization
    return createHash('sha256').update(ip).digest('hex');
  }
}
