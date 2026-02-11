/**
 * Platform Stats Service
 *
 * Provides platform-wide statistics.
 * Access controlled by permission system, not hardcoded roles.
 *
 * Single Responsibility: Aggregate statistics for platform monitoring.
 */

import { Injectable } from '@nestjs/common';
import { AuthorizationService } from '@/bounded-contexts/identity/authorization';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { TIME_MS } from '@/shared-kernel';

const DAYS_FOR_RECENT = 7;

@Injectable()
export class PlatformStatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthorizationService,
  ) {}

  /**
   * Get comprehensive platform statistics
   * Requires 'stats:read' or 'stats:manage' permission
   */
  async getStatistics() {
    const [totalUsers, totalResumes, usersWithOnboarding, recentSignups, privilegedUserCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.resume.count(),
        this.prisma.user.count({ where: { hasCompletedOnboarding: true } }),
        this.countRecentSignups(),
        this.authService.countUsersWithRole('admin'),
      ]);

    return {
      users: {
        total: totalUsers,
        privileged: privilegedUserCount,
        regular: totalUsers - privilegedUserCount,
        withOnboarding: usersWithOnboarding,
        recentSignups,
      },
      resumes: {
        total: totalResumes,
      },
    };
  }

  private async countRecentSignups(): Promise<number> {
    const recentDate = new Date(Date.now() - DAYS_FOR_RECENT * TIME_MS.DAY);

    return this.prisma.user.count({
      where: {
        createdAt: { gte: recentDate },
      },
    });
  }
}
