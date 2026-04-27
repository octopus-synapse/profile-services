/**
 * Aggregates platform-wide statistics for the `/v1/platform/stats`
 * endpoint. The repository is the single fan-out point; the use case
 * just splits totals into privileged/regular and shapes the view.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { PlatformStats } from '../../../domain/entities/platform-stats';
import { PlatformStatsRepositoryPort } from '../../../domain/ports/platform-stats.repository.port';

const CTX = 'GetPlatformStatsUseCase';

export class GetPlatformStatsUseCase {
  constructor(
    private readonly repository: PlatformStatsRepositoryPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(now: Date = new Date()): Promise<PlatformStats> {
    const counts = await this.repository.loadCounts(now);
    this.logger.debug('Computed platform stats', CTX, {
      totalUsers: counts.totalUsers,
      totalResumes: counts.totalResumes,
    });

    return {
      users: {
        total: counts.totalUsers,
        privileged: counts.privilegedUserCount,
        regular: counts.totalUsers - counts.privilegedUserCount,
        withOnboarding: counts.usersWithOnboarding,
        recentSignups: counts.recentSignups,
      },
      resumes: { total: counts.totalResumes },
    };
  }
}
