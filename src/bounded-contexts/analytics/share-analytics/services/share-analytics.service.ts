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
import { SHARE_ANALYTICS_REPOSITORY, type ShareAnalyticsRepositoryPort } from '../ports';

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
  constructor(
    @Inject(SHARE_ANALYTICS_REPOSITORY)
    private readonly repository: ShareAnalyticsRepositoryPort,
  ) {}

  async trackEvent(dto: TrackEvent) {
    // Anonymize IP (GDPR compliance)
    const ipHash = this.anonymizeIP(dto.ip);

    return this.repository.create({
      shareId: dto.shareId,
      event: dto.event,
      ipHash,
      userAgent: dto.userAgent,
      referer: dto.referer,
      country: dto.country,
      city: dto.city,
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
      createdAt: event.createdAt,
    }));
  }

  private anonymizeIP(ip: string): string {
    // SHA-256 hash for anonymization
    return createHash('sha256').update(ip).digest('hex');
  }
}
