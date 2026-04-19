/**
 * Get Share Analytics Use Case
 *
 * Retrieves aggregated analytics for a shared resume.
 */

import {
  EntityNotFoundException,
  ForbiddenException,
} from '@/shared-kernel/exceptions/domain.exceptions';
import type { ShareAnalyticsRepositoryPort } from '../../../ports';

export class GetShareAnalyticsUseCase {
  constructor(private readonly repository: ShareAnalyticsRepositoryPort) {}

  async execute(shareId: string, userId: string) {
    const share = await this.repository.findShareWithOwner(shareId);

    if (!share) {
      throw new EntityNotFoundException('Share', shareId);
    }

    if (share.resume.userId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    const analytics = await this.repository.groupByEvent(shareId);
    const uniqueViews = await this.repository.groupByIpHash(shareId);
    const byCountry = await this.repository.groupByCountry(shareId, 10);
    const byDeviceType = await this.repository.groupByDeviceType(shareId);
    const recentEvents = await this.repository.getRecentEvents(shareId, 20);

    return {
      shareId,
      totalViews: analytics.find((a) => a.event === 'VIEW')?._count.event ?? 0,
      totalDownloads: analytics.find((a) => a.event === 'DOWNLOAD')?._count.event ?? 0,
      uniqueVisitors: uniqueViews.length,
      byCountry: byCountry.map((c) => ({
        country: c.country,
        count: c._count.country,
      })),
      byDeviceType: byDeviceType.map((d) => ({
        deviceType: d.deviceType,
        count: d._count.deviceType,
      })),
      recentEvents,
    };
  }
}
