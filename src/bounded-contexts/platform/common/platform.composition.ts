/**
 * Pure-TS wiring for the platform/common BC. Zero `@nestjs/*` imports.
 *
 * The cross-cutting infrastructure (cache, email, logger, audit,
 * idempotency, rate-limit, s3-upload, markdown transformer, etc.)
 * stays in dedicated Nest modules elsewhere under `platform/common/`
 * — this composition only assembles the four POJO use-case slices
 * (admin-dashboard, admin-alerts, platform-stats, enums).
 */

import type { AuthorizationService } from '@/bounded-contexts/identity/authorization';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import type { LoggerPort } from '@/shared-kernel';
import { PlatformUseCases } from './application/ports/platform.port';
import { GetAdminAlertsUseCase } from './application/use-cases/get-admin-alerts/get-admin-alerts.use-case';
import { GetAdminDashboardMetricsUseCase } from './application/use-cases/get-admin-dashboard-metrics/get-admin-dashboard-metrics.use-case';
import { GetPlatformStatsUseCase } from './application/use-cases/get-platform-stats/get-platform-stats.use-case';
import { ListExportFormatsUseCase } from './application/use-cases/list-export-formats/list-export-formats.use-case';
import { ListSectionTypesUseCase } from './application/use-cases/list-section-types/list-section-types.use-case';
import { ListUserRolesUseCase } from './application/use-cases/list-user-roles/list-user-roles.use-case';
import { SectionTypesCatalogAdapter } from './infrastructure/adapters/catalogs/section-types-catalog.adapter';
import { PrismaAdminAlertsRepository } from './infrastructure/adapters/persistence/prisma-admin-alerts.repository';
import { PrismaAdminDashboardRepository } from './infrastructure/adapters/persistence/prisma-admin-dashboard.repository';
import { PrismaPlatformStatsRepository } from './infrastructure/adapters/persistence/prisma-platform-stats.repository';

export { PlatformUseCases };

export function buildPlatformUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
  authorization: AuthorizationService,
  sectionTypeRepository: SectionTypeRepository,
): PlatformUseCases {
  // Repos / catalogs
  const adminDashboardRepo = new PrismaAdminDashboardRepository(prisma, logger);
  const adminAlertsRepo = new PrismaAdminAlertsRepository(prisma, logger);
  const platformStatsRepo = new PrismaPlatformStatsRepository(prisma, authorization, logger);
  const sectionTypesCatalog = new SectionTypesCatalogAdapter(sectionTypeRepository);

  return {
    getAdminDashboardMetrics: new GetAdminDashboardMetricsUseCase(adminDashboardRepo, logger),
    getAdminAlerts: new GetAdminAlertsUseCase(adminAlertsRepo, logger),
    getPlatformStats: new GetPlatformStatsUseCase(platformStatsRepo, logger),
    listExportFormats: new ListExportFormatsUseCase(),
    listUserRoles: new ListUserRolesUseCase(),
    listSectionTypes: new ListSectionTypesUseCase(sectionTypesCatalog),
  };
}
