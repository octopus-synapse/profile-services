import { LoggerPort } from '@/shared-kernel';
import { ShareAnalyticsService } from '../services/share-analytics.service';

/**
 * Local payload types — zero coupling with presentation BC.
 */
interface ShareViewedPayload {
  readonly shareId: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly referer?: string;
}

interface ShareDownloadedPayload {
  readonly shareId: string;
  readonly ip?: string;
  readonly userAgent?: string;
  readonly referer?: string;
}

interface ShareDomainEvent<T> {
  readonly payload: T;
}

export class ShareEventHandler {
  constructor(
    private readonly analyticsService: ShareAnalyticsService,
    private readonly logger: LoggerPort,
  ) {}

  async handleShareViewed(event: ShareDomainEvent<ShareViewedPayload>): Promise<void> {
    const { shareId, ip, userAgent, referer } = event.payload;

    await this.analyticsService.trackEvent({
      shareId,
      event: 'VIEW',
      ip: ip ?? 'unknown',
      userAgent,
      referer,
    });
  }

  async handleShareDownloaded(event: ShareDomainEvent<ShareDownloadedPayload>): Promise<void> {
    const { shareId, ip, userAgent, referer } = event.payload;

    await this.analyticsService.trackEvent({
      shareId,
      event: 'DOWNLOAD',
      ip: ip ?? 'unknown',
      userAgent,
      referer,
    });
  }
}
