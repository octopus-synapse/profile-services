import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
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

@Injectable()
export class ShareEventHandler {
  constructor(private readonly analyticsService: ShareAnalyticsService) {}

  @OnEvent('presentation.share.viewed')
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

  @OnEvent('presentation.share.downloaded')
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
