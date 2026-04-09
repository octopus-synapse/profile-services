/**
 * Share Analytics Port
 *
 * Defines the use cases interface and injection token for Share Analytics.
 */

import type { AnalyticsEvent } from '@prisma/client';

export type { ShareAnalyticsRepositoryPort } from '../../ports';

export const SHARE_ANALYTICS_USE_CASES = Symbol('SHARE_ANALYTICS_USE_CASES');

interface TrackEvent {
  shareId: string;
  event: AnalyticsEvent;
  ip: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
}

export interface ShareAnalyticsUseCases {
  trackShareEventUseCase: {
    execute: (dto: TrackEvent) => Promise<{
      id: string;
      shareId: string;
      event: AnalyticsEvent;
      ipHash: string;
      userAgent: string | null;
      referer: string | null;
      country: string | null;
      city: string | null;
      createdAt: Date;
    }>;
  };
  getShareAnalyticsUseCase: {
    execute: (
      shareId: string,
      userId: string,
    ) => Promise<{
      shareId: string;
      totalViews: number;
      totalDownloads: number;
      uniqueVisitors: number;
      byCountry: Array<{ country: string | null; count: number }>;
      recentEvents: Array<{
        event: AnalyticsEvent;
        country: string | null;
        city: string | null;
        createdAt: Date;
      }>;
    }>;
  };
  getShareEventsUseCase: {
    execute: (
      shareId: string,
      userId: string,
      filters?: {
        startDate?: Date;
        endDate?: Date;
        eventType?: 'VIEW' | 'DOWNLOAD';
      },
    ) => Promise<
      Array<{
        eventType: AnalyticsEvent;
        ipAddress: string;
        userAgent: string | null;
        referrer: string | null;
        country: string | null;
        city: string | null;
        createdAt: Date;
      }>
    >;
  };
}
