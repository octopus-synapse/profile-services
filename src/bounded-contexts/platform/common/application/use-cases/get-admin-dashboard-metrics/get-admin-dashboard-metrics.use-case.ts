/**
 * Composes the admin-dashboard projection from the raw counts the
 * repository returns. The onboarding completion rate is derived here
 * (rounded percent of users) so the persistence layer stays a pure
 * read.
 *
 * `averageAtsScore` is hard-coded to 0 — the ATS aggregation against
 * `ResumeAnalytics` was dropped in the scoring refactor and the
 * replacement (wired against `ResumeQualityScoreHistory`) lands in a
 * follow-up.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { AdminDashboardMetrics } from '../../../domain/entities/admin-dashboard-metrics';
import { AdminDashboardRepositoryPort } from '../../../domain/ports/admin-dashboard.repository.port';

const CTX = 'GetAdminDashboardMetricsUseCase';

export class GetAdminDashboardMetricsUseCase {
  constructor(
    private readonly repository: AdminDashboardRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(now: Date = new Date()): Promise<AdminDashboardMetrics> {
    const counts = await this.repository.loadCounts(now);
    const onboardingCompletionRate =
      counts.totalUsers > 0
        ? Math.round((counts.onboardingCompleted / counts.totalUsers) * 100)
        : 0;

    this.logger.debug('Computed admin dashboard metrics', CTX, {
      totalUsers: counts.totalUsers,
      onboardingCompletionRate,
    });

    return {
      totalUsers: counts.totalUsers,
      totalResumes: counts.totalResumes,
      activeUsers7d: counts.activeUsers7d,
      activeUsers30d: counts.activeUsers30d,
      totalViews: counts.totalViews,
      signupsThisWeek: counts.signupsThisWeek,
      signupsThisMonth: counts.signupsThisMonth,
      resumesThisWeek: counts.resumesThisWeek,
      resumesThisMonth: counts.resumesThisMonth,
      averageAtsScore: 0,
      onboardingCompletionRate,
    };
  }
}
