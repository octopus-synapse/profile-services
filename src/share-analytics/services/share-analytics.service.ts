import { Injectable } from '@nestjs/common';
import { ResourceOwnershipError } from '@octopus-synapse/profile-contracts';
import { createHash } from 'crypto';
import type { AnalyticsEvent } from '@prisma/client';
import { ShareAnalyticsRepository } from '../repositories';

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
  constructor(private readonly repository: ShareAnalyticsRepository) {}

  async trackEvent(dto: TrackEvent) {
    // Anonymize IP (GDPR compliance)
    const ipHash = this.anonymizeIP(dto.ip);

    return this.repository.createEvent({
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
      throw new ResourceOwnershipError('resume', shareId);
    }

    if (share.resume.userId !== userId) {
      throw new ResourceOwnershipError('resume', shareId);
    }

    // Get event counts
    const analytics = await this.repository.getEventCounts(shareId);

    // Get unique views (unique IP hashes)
    const uniqueViews = await this.repository.getUniqueViews(shareId);

    // Get geo data
    const byCountry = await this.repository.getByCountry(shareId);

    // Recent events
    const recentEvents = await this.repository.getRecentEvents(shareId);

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
    const share = await this.repository.findShareWithOwner(shareId);

    if (!share) {
      throw new ResourceOwnershipError('resume', shareId);
    }

    if (share.resume.userId !== userId) {
      throw new ResourceOwnershipError('resume', shareId);
    }

    const events = await this.repository.findEvents(shareId, filters);

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
