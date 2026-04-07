/**
 * Get Share Events Use Case
 *
 * Retrieves detailed analytics events for a share.
 */

import { ForbiddenException } from '@nestjs/common';
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
      throw new ForbiddenException('Share not found');
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
}
