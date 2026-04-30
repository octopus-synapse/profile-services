/**
 * Prisma adapter for `PlatformStatsRepositoryPort`.
 *
 * Fans out user/resume counts plus the privileged-role population.
 * The "privileged" count is delegated to `AuthorizationService` so we
 * inherit the existing role-name lookup and don't duplicate the join
 * across `UserRole` / `Role` tables here.
 */

import { AuthorizationService } from '@/bounded-contexts/identity/authorization';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort, TIME_MS } from '@/shared-kernel';
import type { PlatformStatsCounts } from '../../../domain/entities/platform-stats';
import { PlatformStatsRepositoryPort } from '../../../domain/ports/platform-stats.repository.port';

const DAYS_FOR_RECENT = 7;

export class PrismaPlatformStatsRepository extends PlatformStatsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthorizationService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async loadCounts(now: Date): Promise<PlatformStatsCounts> {
    const recentDate = new Date(now.getTime() - DAYS_FOR_RECENT * TIME_MS.DAY);

    const [totalUsers, totalResumes, usersWithOnboarding, recentSignups, privilegedUserCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.resume.count(),
        this.prisma.user.count({ where: { onboardingCompletedAt: { not: null } } }),
        this.prisma.user.count({ where: { createdAt: { gte: recentDate } } }),
        this.authService.countUsersWithRole('admin'),
      ]);

    this.logger.debug('Loaded platform stats counts', 'PrismaPlatformStatsRepository', {
      totalUsers,
      totalResumes,
    });

    return {
      totalUsers,
      totalResumes,
      usersWithOnboarding,
      recentSignups,
      privilegedUserCount,
    };
  }
}
