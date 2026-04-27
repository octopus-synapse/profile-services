/**
 * Outbound port for admin alert queue reads.
 *
 * The use case owns the in-memory TTL cache; the repository is a
 * pure projection over Prisma.
 */

import type { AdminAlertCounts } from '../entities/admin-alerts';

export abstract class AdminAlertsRepositoryPort {
  abstract loadCounts(now: Date): Promise<AdminAlertCounts>;
}
