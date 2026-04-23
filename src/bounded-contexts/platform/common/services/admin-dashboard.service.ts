import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
      atsScoreAvg,
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
      // ATS-score aggregation on ResumeAnalytics was dropped in the scoring
      // refactor — the replacement wires against ResumeQualityScoreHistory
      // in the follow-up task. Dashboard exposes 0 as a placeholder.
      Promise.resolve(null as unknown),
      this.prisma.user.count({ where: { hasCompletedOnboarding: true } }),
    ]);

    const onboardingCompletionRate =
      totalUsers > 0 ? Math.round((onboardingCompleted / totalUsers) * 100) : 0;

    void atsScoreAvg;
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
      averageAtsScore: 0,
      onboardingCompletionRate,
    };
  }
}
