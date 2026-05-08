/**
 * Prisma-backed implementation of `AdminAnalyticsRepositoryPort`.
 *
 * Every method is a one-shot read; nothing here is shared state. The
 * use case fans out to all of them in parallel via Promise.all. Raw
 * SQL is used where Prisma's groupBy can't do bucketing/date-trunc.
 */

import { Prisma } from '@prisma/client';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import {
  type ActiveUsersStats,
  type AdminAnalyticsPeriod,
  AdminAnalyticsRepositoryPort,
  type AtsScoreBucket,
  type ContentStats,
  type JobStats,
  type MostUsedSection,
  type ResumesByLanguageBucket,
  type SocialStats,
  type SourceCount,
  type UserGrowthBucket,
} from '../../../domain/ports/admin-analytics.repository.port';

export class PrismaAdminAnalyticsRepository extends AdminAnalyticsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async getUserGrowth(period: AdminAnalyticsPeriod): Promise<UserGrowthBucket[]> {
    const limitMap = { day: 30, week: 12, month: 12 };
    const truncMap = { day: 'day', week: 'week', month: 'month' } as const;
    // `period` is a closed type union, so the interval expansion is a
    // whitelist — safe to render as raw. The TRUNC unit is also whitelisted.
    const intervalSql = Prisma.raw(`'${limitMap[period]} ${truncMap[period]}s'`);
    const trunc = truncMap[period];

    const results = await this.prisma.$queryRaw<{ date: Date; count: bigint }[]>`
      SELECT DATE_TRUNC(${trunc}, "createdAt") as date, COUNT(*)::bigint as count
      FROM "User"
      WHERE "createdAt" >= NOW() - INTERVAL ${intervalSql}
      GROUP BY date
      ORDER BY date
    `;

    return results.map((r) => ({ date: r.date.toISOString(), count: Number(r.count) }));
  }

  async getResumesByLanguage(): Promise<ResumesByLanguageBucket[]> {
    const results = await this.prisma.resume.groupBy({ by: ['primaryLanguage'], _count: true });
    return results.map((r) => ({ language: r.primaryLanguage, count: r._count }));
  }

  async getAtsScoreDistribution(): Promise<AtsScoreBucket[]> {
    const results = await this.prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
      SELECT
        CASE
          WHEN score <= 20 THEN '0-20'
          WHEN score <= 40 THEN '21-40'
          WHEN score <= 60 THEN '41-60'
          WHEN score <= 80 THEN '61-80'
          ELSE '81-100'
        END as bucket,
        COUNT(*)::bigint as count
      FROM (
        SELECT "overallScore" AS score
        FROM "ResumeQualityScoreHistory"
        WHERE "overallScore" IS NOT NULL
      ) AS scores
      GROUP BY bucket
      ORDER BY bucket
    `;
    return results.map((r) => ({ bucket: r.bucket, count: Number(r.count) }));
  }

  async getMostUsedSections(): Promise<MostUsedSection[]> {
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

  async getImportSources(): Promise<SourceCount[]> {
    const results = await this.prisma.resumeImport.groupBy({ by: ['source'], _count: true });
    return results.map((r) => ({ source: r.source, count: r._count }));
  }

  async getViewSources(): Promise<SourceCount[]> {
    const results = await this.prisma.resumeViewEvent.groupBy({
      by: ['source'],
      _count: true,
      orderBy: { _count: { source: 'desc' } },
      take: 10,
    });
    return results.map((r) => ({ source: r.source, count: r._count }));
  }

  async getActiveUsers(): Promise<ActiveUsersStats> {
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
    return { dau: Number(dau[0]?.count ?? 0), mau: Number(mau[0]?.count ?? 0) };
  }

  async getContentStats(): Promise<ContentStats> {
    const [posts, comments, reactions] = await Promise.all([
      this.prisma.post.count({ where: { isDeleted: false } }),
      this.prisma.postComment.count({ where: { isDeleted: false } }),
      this.prisma.postLike.count(),
    ]);
    return { posts, comments, reactions };
  }

  async getSocialStats(): Promise<SocialStats> {
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

  async getJobStats(): Promise<JobStats> {
    const [postedJobs, activeJobs, applications, withdrawn] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.count({ where: { isActive: true } }),
      this.prisma.jobApplication.count({ where: { status: { not: 'WITHDRAWN' } } }),
      this.prisma.jobApplication.count({ where: { status: 'WITHDRAWN' } }),
    ]);
    const applicationsPerJob =
      postedJobs > 0 ? Math.round((applications / postedJobs) * 100) / 100 : 0;
    return { postedJobs, activeJobs, applications, withdrawn, applicationsPerJob };
  }
}
