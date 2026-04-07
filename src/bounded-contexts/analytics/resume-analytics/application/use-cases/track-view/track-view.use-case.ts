/**
 * Track View Use Case
 *
 * Tracks a resume view event with IP anonymization and source detection.
 */

import { createHash } from 'node:crypto';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { TRAFFIC_SOURCES } from '../../../domain/value-objects/traffic-sources';
import type { TrackView } from '../../../interfaces';
import type { ResumeOwnershipPort, ViewTrackingRepositoryPort } from '../../ports/resume-analytics.port';

export class TrackViewUseCase {
  constructor(
    private readonly ownership: ResumeOwnershipPort,
    private readonly viewTrackingRepo: ViewTrackingRepositoryPort,
    private readonly eventEmitter: EventEmitter2,
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

    // Emit SSE event with updated view count
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const totalViews = await this.viewTrackingRepo.countViews(
      input.resumeId,
      new Date(0),
      now,
    );

    this.eventEmitter.emit(`analytics:${input.resumeId}:view`, {
      type: 'view',
      resumeId: input.resumeId,
      data: {
        views: totalViews,
        timestamp: new Date(),
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
