/**
 * Outbound port for platform statistics.
 *
 * Aggregates user/resume counts plus the privileged-role population
 * so the use case can compose the response without touching Prisma
 * or the authorization service directly.
 */

import type { PlatformStatsCounts } from '../entities/platform-stats';

export abstract class PlatformStatsRepositoryPort {
  abstract loadCounts(now: Date): Promise<PlatformStatsCounts>;
}
