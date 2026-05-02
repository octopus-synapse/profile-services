/**
 * Get Share Events Use Case
 *
 * Retrieves detailed analytics events for a share.
 */

import { EntityNotFoundException } from '@/shared-kernel/exceptions/domain.exceptions';
import {
  AggregationBackendUnavailableException,
  DateRangeTooLargeException,
  InvalidDateRangeException,
  ShareAnalyticsNotAuthorizedException,
} from '../../../../domain/exceptions/analytics.exceptions';
import type { ShareAnalyticsRepositoryPort } from '../../../ports';

/** Hard cap for ad-hoc share-event scans — anything broader should hit
 *  the materialized aggregations BC instead of the raw event table. */
const MAX_RANGE_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export class GetShareEventsUseCase {
  constructor(private readonly repository: ShareAnalyticsRepositoryPort) {}

  async execute(
    shareId: string,
    userId: string,
    filters?: { startDate?: Date; endDate?: Date; eventType?: 'VIEW' | 'DOWNLOAD' },
  ) {
    if (filters?.startDate && filters?.endDate) {
      if (filters.startDate.getTime() >= filters.endDate.getTime()) {
        throw new InvalidDateRangeException();
      }
      const rangeDays = (filters.endDate.getTime() - filters.startDate.getTime()) / MS_PER_DAY;
      if (rangeDays > MAX_RANGE_DAYS) {
        throw new DateRangeTooLargeException(MAX_RANGE_DAYS);
      }
    }

    const share = await this.repository.findShareWithOwner(shareId);

    if (!share) {
      throw new EntityNotFoundException('Share', shareId);
    }

    if (share.resume.userId !== userId) {
      throw new ShareAnalyticsNotAuthorizedException();
    }

    let events: Awaited<ReturnType<typeof this.repository.getDetailedEvents>>;
    try {
      events = await this.repository.getDetailedEvents(shareId, filters);
    } catch {
      // Surface aggregator outages with a stable code so the envelope
      // doesn't leak the raw Prisma / ClickHouse error message.
      throw new AggregationBackendUnavailableException();
    }

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
