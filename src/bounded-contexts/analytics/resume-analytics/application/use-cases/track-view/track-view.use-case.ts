import { createHash } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { TRAFFIC_SOURCES } from '../../../domain/value-objects/traffic-sources';
import type { TrackView } from '../../../interfaces';
import {
  ANALYTICS_EVENT_BUS_PORT,
  AnalyticsEventBusPort,
} from '../../ports/analytics-event-bus.port';
import type {
  ResumeOwnershipPort,
  ViewTrackingRepositoryPort,
} from '../../ports/resume-analytics.port';

export class TrackViewUseCase {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly viewTrackingRepo: ViewTrackingRepositoryPort,
    @Inject(ANALYTICS_EVENT_BUS_PORT)
    private readonly eventBus: AnalyticsEventBusPort,
  ) {}

  async execute(input: TrackView): Promise<void> {
    await this.ownership.verifyResumeExists(input.resumeId);

    const ipHash = this.anonymizeIP(input.ip);
    const source = this.detectSource(input.referer);

    await this.viewTrackingRepo.trackView({
      resumeId: input.resumeId,
      ipHash,
      userAgent: input.userAgent,
      referer: input.referer,
      country: input.country,
      city: input.city,
      source,
    });

    const now = new Date();
    const totalViews = await this.viewTrackingRepo.countViews(input.resumeId, new Date(0), now);

    this.eventBus.emit(`analytics:${input.resumeId}:view`, {
      type: 'view',
      resumeId: input.resumeId,
      data: {
        views: totalViews,
        timestamp: now,
      },
    });
  }

  private anonymizeIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }

  private detectSource(referer?: string): string {
    if (!referer) return 'direct';
    const refererLower = referer.toLowerCase();
    for (const [domain, source] of Object.entries(TRAFFIC_SOURCES)) {
      if (refererLower.includes(domain)) return source;
    }
    return 'other';
  }
}
