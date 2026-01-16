/**
 * Admin Stats Service
 * Single Responsibility: Dashboard statistics for admin panel
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { TIME_MS } from '@octopus-synapse/profile-contracts';

const DAYS_FOR_RECENT = 7;

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStatistics() {
    const [
      totalUserCount,
      totalAdminCount,
      totalResumeCount,
      usersWithCompletedOnboardingCount,
      recentSignupsCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.resume.count(),
      this.prisma.user.count({ where: { hasCompletedOnboarding: true } }),
      this.countRecentUserSignups(),
    ]);

    const userStatistics = {
      total: totalUserCount,
      admins: totalAdminCount,
      regular: totalUserCount - totalAdminCount,
      withOnboarding: usersWithCompletedOnboardingCount,
      recentSignups: recentSignupsCount,
    };

    const resumeStatistics = {
      total: totalResumeCount,
    };

    return {
      users: userStatistics,
      resumes: resumeStatistics,
    };
  }

  private async countRecentUserSignups(): Promise<number> {
    const recentSignupDate = new Date(
      Date.now() - DAYS_FOR_RECENT * TIME_MS.DAY,
    );

    return this.prisma.user.count({
      where: {
        createdAt: { gte: recentSignupDate },
      },
    });
  }
}
