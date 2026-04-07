/**
 * Track Share Event Use Case
 *
 * Tracks VIEW/DOWNLOAD events on shared resumes with GDPR-compliant IP anonymization.
 */

import { createHash } from 'node:crypto';
import type { AnalyticsEvent } from '@prisma/client';
import type { ShareAnalyticsRepositoryPort } from '../../../ports';

interface TrackEvent {
  shareId: string;
  event: AnalyticsEvent;
  ip: string;
  userAgent?: string;
  referer?: string;
  country?: string;
  city?: string;
}

export class TrackShareEventUseCase {
  constructor(private readonly repository: ShareAnalyticsRepositoryPort) {}

  async execute(dto: TrackEvent) {
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

  private anonymizeIP(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }
}
