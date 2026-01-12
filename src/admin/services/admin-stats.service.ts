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

  async getStats() {
    const [
      totalUsers,
      totalAdmins,
      totalResumes,
      usersWithOnboarding,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
      this.prisma.resume.count(),
      this.prisma.user.count({ where: { hasCompletedOnboarding: true } }),
      this.getRecentUsersCount(),
    ]);

    return {
      users: {
        total: totalUsers,
        admins: totalAdmins,
        regular: totalUsers - totalAdmins,
        withOnboarding: usersWithOnboarding,
        recentSignups: recentUsers,
      },
      resumes: {
        total: totalResumes,
      },
    };
  }

  private async getRecentUsersCount(): Promise<number> {
    const recentDate = new Date(Date.now() - DAYS_FOR_RECENT * TIME_MS.DAY);

    return this.prisma.user.count({
      where: {
        createdAt: { gte: recentDate },
      },
    });
  }
}
