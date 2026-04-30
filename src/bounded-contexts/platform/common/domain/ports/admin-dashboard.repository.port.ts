/**
 * Outbound port for admin-dashboard reads.
 *
 * Returns raw counts only — derived metrics (rates, projections)
 * stay in the use case so the adapter can be swapped without
 * dragging business rules along.
 */

import type { AdminDashboardCounts } from '../entities/admin-dashboard-metrics';

export abstract class AdminDashboardRepositoryPort {
  abstract loadCounts(now: Date): Promise<AdminDashboardCounts>;
}
