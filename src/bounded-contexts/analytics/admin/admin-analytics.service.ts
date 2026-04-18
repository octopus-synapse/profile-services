import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(period: 'day' | 'week' | 'month' = 'week') {
    const [
      userGrowth,
      resumesByLanguage,
      atsScoreDistribution,
      mostUsedSections,
      importSources,
      viewSources,
      activeUsers,
      contentStats,
      socialStats,
      jobStats,
    ] = await Promise.all([
      this.getUserGrowth(period),
      this.getResumesByLanguage(),
      this.getAtsScoreDistribution(),
      this.getMostUsedSections(),
      this.getImportSources(),
      this.getViewSources(),
      this.getActiveUsers(),
      this.getContentStats(),
      this.getSocialStats(),
      this.getJobStats(),
    ]);

    return {
      userGrowth,
      resumesByLanguage,
      atsScoreDistribution,
      mostUsedSections,
      importSources,
      viewSources,
      activeUsers,
      contentStats,
      socialStats,
      jobStats,
    };
  }

  /**
   * DAU and MAU calculated from PlatformEvent — falls back to 0 if the
   * tracking endpoint is silent (e.g., during local dev without UI events).
   */
  private async getActiveUsers() {
    const [dau, mau] = await Promise.all([
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId")::bigint as count
        FROM "platform_event"
        WHERE "occurredAt" >= NOW() - INTERVAL '1 day' AND "userId" IS NOT NULL
      `,
      this.prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId")::bigint as count
        FROM "platform_event"
        WHERE "occurredAt" >= NOW() - INTERVAL '30 days' AND "userId" IS NOT NULL
      `,
    ]);
    return {
      dau: Number(dau[0]?.count ?? 0),
      mau: Number(mau[0]?.count ?? 0),
    };
  }

  private async getContentStats() {
    const [posts, comments, reactions] = await Promise.all([
      this.prisma.post.count({ where: { isDeleted: false } }),
      this.prisma.postComment.count({ where: { isDeleted: false } }),
      this.prisma.postLike.count(),
    ]);
    return { posts, comments, reactions };
  }

  private async getSocialStats() {
    const [pendingInvitations, acceptedConnections, rejectedConnections, blockedUsers] =
      await Promise.all([
        this.prisma.connection.count({ where: { status: 'PENDING' } }),
        this.prisma.connection.count({ where: { status: 'ACCEPTED' } }),
        this.prisma.connection.count({ where: { status: 'REJECTED' } }),
        this.prisma.blockedUser.count(),
      ]);
    const totalDecided = acceptedConnections + rejectedConnections;
    const acceptanceRate =
      totalDecided > 0 ? Math.round((acceptedConnections / totalDecided) * 100) : 0;
    return {
      pendingInvitations,
      acceptedConnections,
      rejectedConnections,
      blockedUsers,
      acceptanceRate,
    };
  }

  private async getJobStats() {
    const [postedJobs, activeJobs, applications, withdrawn] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.count({ where: { isActive: true } }),
      this.prisma.jobApplication.count({ where: { status: { not: 'WITHDRAWN' } } }),
      this.prisma.jobApplication.count({ where: { status: 'WITHDRAWN' } }),
    ]);
    const applicationsPerJob =
      postedJobs > 0 ? Math.round((applications / postedJobs) * 100) / 100 : 0;
    return {
      postedJobs,
      activeJobs,
      applications,
      withdrawn,
      applicationsPerJob,
    };
  }

  private async getUserGrowth(period: 'day' | 'week' | 'month') {
    const _intervalMap = { day: '1 day', week: '1 week', month: '1 month' };
    const limitMap = { day: 30, week: 12, month: 12 };
    const truncMap = { day: 'day', week: 'week', month: 'month' };

    const results = await this.prisma.$queryRawUnsafe<{ date: Date; count: bigint }[]>(
      `SELECT DATE_TRUNC($1, "createdAt") as date, COUNT(*)::bigint as count
       FROM "User"
       WHERE "createdAt" >= NOW() - INTERVAL '${limitMap[period]} ${truncMap[period]}s'
       GROUP BY date
       ORDER BY date`,
      truncMap[period],
    );

    return results.map((r) => ({ date: r.date.toISOString(), count: Number(r.count) }));
  }

  private async getResumesByLanguage() {
    const results = await this.prisma.resume.groupBy({
      by: ['primaryLanguage'],
      _count: true,
    });
    return results.map((r) => ({ language: r.primaryLanguage, count: r._count }));
  }

  private async getAtsScoreDistribution() {
    const results = await this.prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
      SELECT
        CASE
          WHEN "atsScore" <= 20 THEN '0-20'
          WHEN "atsScore" <= 40 THEN '21-40'
          WHEN "atsScore" <= 60 THEN '41-60'
          WHEN "atsScore" <= 80 THEN '61-80'
          ELSE '81-100'
        END as bucket,
        COUNT(*)::bigint as count
      FROM "ResumeAnalytics"
      WHERE "atsScore" IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket
    `;
    return results.map((r) => ({ bucket: r.bucket, count: Number(r.count) }));
  }

  private async getMostUsedSections() {
    const results = await this.prisma.resumeSection.groupBy({
      by: ['sectionTypeId'],
      _count: true,
      orderBy: { _count: { sectionTypeId: 'desc' } },
      take: 10,
    });

    const sectionTypeIds = results.map((r) => r.sectionTypeId);
    const sectionTypes = await this.prisma.sectionType.findMany({
      where: { id: { in: sectionTypeIds } },
      select: { id: true, title: true, key: true },
    });

    const typeMap = new Map(sectionTypes.map((st) => [st.id, st]));
    return results.map((r) => ({
      sectionTypeId: r.sectionTypeId,
      title: typeMap.get(r.sectionTypeId)?.title ?? 'Unknown',
      key: typeMap.get(r.sectionTypeId)?.key ?? 'unknown',
      count: r._count,
    }));
  }

  private async getImportSources() {
    const results = await this.prisma.resumeImport.groupBy({
      by: ['source'],
      _count: true,
    });
    return results.map((r) => ({ source: r.source, count: r._count }));
  }

  private async getViewSources() {
    const results = await this.prisma.resumeViewEvent.groupBy({
      by: ['source'],
      _count: true,
      orderBy: { _count: { source: 'desc' } },
      take: 10,
    });
    return results.map((r) => ({ source: r.source, count: r._count }));
  }
}
