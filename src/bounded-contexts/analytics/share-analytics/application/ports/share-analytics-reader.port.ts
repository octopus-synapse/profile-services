/**
 * Share Analytics Reader Port
 *
 * Controller-facing abstraction consumed by ShareAnalyticsController.
 * Decouples the controller from the concrete ShareAnalyticsService.
 */

export type ShareAnalyticsRecentEvent = {
  event: 'VIEW' | 'DOWNLOAD';
  country: string | null;
  city: string | null;
  createdAt: Date;
};

export type ShareAnalyticsSummary = {
  shareId: string;
  totalViews: number;
  totalDownloads: number;
  uniqueVisitors: number;
  byCountry: Array<{ country: string | null; count: number }>;
  recentEvents: ShareAnalyticsRecentEvent[];
};

export type ShareAnalyticsEventItem = {
  eventType: 'VIEW' | 'DOWNLOAD';
  ipAddress: string;
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  createdAt: Date;
};

export abstract class ShareAnalyticsReaderPort {
  abstract getAnalytics(shareId: string, userId: string): Promise<ShareAnalyticsSummary>;

  abstract getEvents(
    shareId: string,
    userId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      eventType?: 'VIEW' | 'DOWNLOAD';
    },
  ): Promise<ShareAnalyticsEventItem[]>;
}
