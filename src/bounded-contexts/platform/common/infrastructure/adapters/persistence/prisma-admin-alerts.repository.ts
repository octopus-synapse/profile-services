/**
 * Prisma adapter for `AdminAlertsRepositoryPort`.
 *
 * The use case owns the TTL cache; this adapter just runs three
 * targeted counts in parallel.
 */

import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import type { AdminAlertCounts } from '../../../domain/entities/admin-alerts';
import { AdminAlertsRepositoryPort } from '../../../domain/ports/admin-alerts.repository.port';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class PrismaAdminAlertsRepository extends AdminAlertsRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerPort,
  ) {
    super();
  }

  async loadCounts(now: Date): Promise<AdminAlertCounts> {
    const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
    const thirtyDaysAgo = new Date(now.getTime() - THIRTY_DAYS_MS);

    const [reportsPending, usersPendingVerification, shadowProfilesStale] = await Promise.all([
      this.prisma.postReport.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count({
        where: { emailVerified: null, createdAt: { lt: sevenDaysAgo } },
      }),
      this.prisma.shadowProfile.count({
        where: { claimedByUserId: null, createdAt: { lt: thirtyDaysAgo } },
      }),
    ]);

    this.logger.debug('Loaded admin alert counts', 'PrismaAdminAlertsRepository', {
      reportsPending,
      usersPendingVerification,
      shadowProfilesStale,
    });

    return { reportsPending, usersPendingVerification, shadowProfilesStale };
  }
}
