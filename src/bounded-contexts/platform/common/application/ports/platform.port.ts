/**
 * Bundle token for the platform/common BC. Doubles as the TypeScript
 * shape of the use-case bag and the Nest DI token. Composition lives
 * in `platform.composition.ts` — Nest-free.
 */

import type { GetAdminAlertsUseCase } from '../use-cases/get-admin-alerts/get-admin-alerts.use-case';
import type { GetAdminDashboardMetricsUseCase } from '../use-cases/get-admin-dashboard-metrics/get-admin-dashboard-metrics.use-case';
import type { GetPlatformStatsUseCase } from '../use-cases/get-platform-stats/get-platform-stats.use-case';
import type { ListExportFormatsUseCase } from '../use-cases/list-export-formats/list-export-formats.use-case';
import type { ListSectionTypesUseCase } from '../use-cases/list-section-types/list-section-types.use-case';
import type { ListUserRolesUseCase } from '../use-cases/list-user-roles/list-user-roles.use-case';

export abstract class PlatformUseCases {
  abstract readonly getAdminDashboardMetrics: GetAdminDashboardMetricsUseCase;
  abstract readonly getAdminAlerts: GetAdminAlertsUseCase;
  abstract readonly getPlatformStats: GetPlatformStatsUseCase;
  abstract readonly listExportFormats: ListExportFormatsUseCase;
  abstract readonly listUserRoles: ListUserRolesUseCase;
  abstract readonly listSectionTypes: ListSectionTypesUseCase;
}
