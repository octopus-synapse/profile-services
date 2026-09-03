/**
 * Prisma adapter for `WeeklyDigestStatsPort`. Aggregates resume views,
 * follows, endorsements, and share-analytics views into a single
 * domain `WeeklyDigestStats` row per user.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { WeeklyDigestStats } from '../../../domain/entities/notification.entity';
import { WeeklyDigestStatsPort } from '../../../domain/ports/weekly-digest-stats.port';

export class PrismaWeeklyDigestStatsAdapter extends WeeklyDigestStatsPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async collect(userId: string, since: Date): Promise<WeeklyDigestStats> {
    const [resumeViews, profileViews] = await Promise.all([
      this.prisma.resumeViewEvent.count({
        where: {
          resume: { userId },
          createdAt: { gte: since },
        },
      }),
      this.prisma.shareAnalytics.count({
        where: {
          share: { resume: { userId } },
          event: 'VIEW',
          createdAt: { gte: since },
        },
      }),
    ]);

    return { resumeViews, profileViews };
  }
}
