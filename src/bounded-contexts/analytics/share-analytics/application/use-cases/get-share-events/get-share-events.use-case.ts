/**
 * Get Share Events Use Case
 *
 * Retrieves detailed analytics events for a share.
 */

import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { ShareAnalyticsRepositoryPort } from '../../../ports';

export class GetShareEventsUseCase {
  constructor(private readonly repository: ShareAnalyticsRepositoryPort) {}

  async execute(
    shareId: string,
    userId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      eventType?: 'VIEW' | 'DOWNLOAD';
    },
  ) {
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
}
