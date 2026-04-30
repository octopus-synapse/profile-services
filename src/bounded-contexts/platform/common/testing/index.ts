/**
 * In-memory test doubles for the platform/common ports. Each one is a
 * faithful POJO so use-case specs don't need a Nest TestingModule.
 */

import type { AdminAlertCounts, AdminAlerts } from '../domain/entities/admin-alerts';
import type { AdminDashboardCounts } from '../domain/entities/admin-dashboard-metrics';
import type { PlatformStatsCounts } from '../domain/entities/platform-stats';
import type { SectionTypeView } from '../domain/entities/section-type-view';
import { AdminAlertsRepositoryPort } from '../domain/ports/admin-alerts.repository.port';
import { AdminDashboardRepositoryPort } from '../domain/ports/admin-dashboard.repository.port';
import { PlatformStatsRepositoryPort } from '../domain/ports/platform-stats.repository.port';
import { SectionTypesCatalogPort } from '../domain/ports/section-types.catalog.port';

export class InMemoryAdminDashboardRepository extends AdminDashboardRepositoryPort {
  constructor(private counts: AdminDashboardCounts) {
    super();
  }

  setCounts(counts: AdminDashboardCounts): void {
    this.counts = counts;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- in-memory stub.
  async loadCounts(_now: Date): Promise<AdminDashboardCounts> {
    void _now;
    return this.counts;
  }
}

export class InMemoryAdminAlertsRepository extends AdminAlertsRepositoryPort {
  callCount = 0;

  constructor(private counts: AdminAlertCounts) {
    super();
  }

  setCounts(counts: AdminAlertCounts): void {
    this.counts = counts;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- in-memory stub.
  async loadCounts(_now: Date): Promise<AdminAlertCounts> {
    void _now;
    this.callCount += 1;
    return this.counts;
  }
}

export class InMemoryPlatformStatsRepository extends PlatformStatsRepositoryPort {
  constructor(private counts: PlatformStatsCounts) {
    super();
  }

  setCounts(counts: PlatformStatsCounts): void {
    this.counts = counts;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- in-memory stub.
  async loadCounts(_now: Date): Promise<PlatformStatsCounts> {
    void _now;
    return this.counts;
  }
}

export class InMemorySectionTypesCatalog extends SectionTypesCatalogPort {
  constructor(private readonly items: readonly SectionTypeView[]) {
    super();
  }

  listAll(): SectionTypeView[] {
    return this.items.map((i) => ({ ...i }));
  }
}

// Re-export so the AdminAlerts type is reachable from specs that
// inspect totals without re-importing from domain/entities.
export type { AdminAlerts };
