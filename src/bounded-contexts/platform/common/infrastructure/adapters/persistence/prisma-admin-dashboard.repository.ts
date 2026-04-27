/**
 * Prisma adapter for `AdminDashboardRepositoryPort`.
 *
 * Fan-out is `Promise.all`-ed so the dashboard tile can render in a
 * single round-trip even on cold caches. The week/month boundaries
 * are derived from the `now` argument the use case supplies, which
 * keeps the adapter clock-pure.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type { AdminDashboardCounts } from '../../../domain/entities/admin-dashboard-metrics';
import { AdminDashboardRepositoryPort } from '../../../domain/ports/admin-dashboard.repository.port';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class PrismaAdminDashboardRepository extends AdminDashboardRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async loadCounts(now: Date): Promise<AdminDashboardCounts> {
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalResumes,
      activeUsers7d,
      activeUsers30d,
      totalViews,
      signupsThisWeek,
      signupsThisMonth,
      resumesThisWeek,
      resumesThisMonth,
      onboardingCompleted,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.resume.count(),
      this.prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
      this.prisma.resumeViewEvent.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.resume.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.resume.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.user.count({ where: { hasCompletedOnboarding: true } }),
    ]);

    this.logger.debug('Loaded admin dashboard counts', 'PrismaAdminDashboardRepository', {
      totalUsers,
      totalResumes,
    });

    return {
      totalUsers,
      totalResumes,
      activeUsers7d,
      activeUsers30d,
      totalViews,
      signupsThisWeek,
      signupsThisMonth,
      resumesThisWeek,
      resumesThisMonth,
      onboardingCompleted,
    };
  }
}
