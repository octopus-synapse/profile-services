/**
 * Returns counts of admin-actionable queues with a 30s in-memory TTL.
 *
 * The TTL guards against the navbar polling this endpoint on every
 * page load — three Prisma counts on tight intervals would dwarf the
 * rest of the admin traffic. The clock is injectable so specs don't
 * have to wait wall-clock time to exercise expiry.
 */

import type { LoggerPort } from '@/shared-kernel';
import type { AdminAlerts } from '../../../domain/entities/admin-alerts';
import { AdminAlertsRepositoryPort } from '../../../domain/ports/admin-alerts.repository.port';

const CTX = 'GetAdminAlertsUseCase';
const CACHE_TTL_MS = 30_000; // lint-allow-bc-cache-ttl: in-memory dashboard cache, not cross-BC; CACHE_PRESETS is for Redis TTLs.

interface CacheEntry {
  readonly at: number;
  readonly data: AdminAlerts;
}

export class GetAdminAlertsUseCase {
  private cache: CacheEntry | null = null;

  constructor(
    private readonly repository: AdminAlertsRepositoryPort,
    private readonly logger: LoggerPort,
    private readonly clock: () => number = Date.now,
  ) {}

  async execute(): Promise<AdminAlerts> {
    const now = this.clock();
    if (this.cache && now - this.cache.at < CACHE_TTL_MS) {
      return this.cache.data;
    }

    const counts = await this.repository.loadCounts(new Date(now));
    const data: AdminAlerts = {
      reportsPending: counts.reportsPending,
      usersPendingVerification: counts.usersPendingVerification,
      shadowProfilesStale: counts.shadowProfilesStale,
      total: counts.reportsPending + counts.usersPendingVerification + counts.shadowProfilesStale,
    };
    this.cache = { at: now, data };
    this.logger.debug('Refreshed admin alert counts', CTX, { total: data.total });
    return data;
  }
}
