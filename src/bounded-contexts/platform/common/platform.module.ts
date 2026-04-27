/**
 * Platform Module
 *
 * ADR-001: four POJO use-case slices (admin-dashboard, admin-alerts,
 * platform-stats, enums) sit on top of dedicated repository / catalog
 * ports. The cross-cutting infrastructure (cache, email, logger,
 * audit, idempotency, rate-limit, s3-upload) lives in dedicated
 * modules elsewhere under `platform/common/`.
 */

import { Module } from '@nestjs/common';
import {
  AuthorizationModule,
  AuthorizationService,
} from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { ResumesCoreModule } from '@/bounded-contexts/resumes/core/resumes.module';
import { SectionTypeRepository } from '@/bounded-contexts/resumes/infrastructure/repositories';
import { LoggerPort } from '@/shared-kernel';
import { GetAdminAlertsUseCase } from './application/use-cases/get-admin-alerts/get-admin-alerts.use-case';
import { GetAdminDashboardMetricsUseCase } from './application/use-cases/get-admin-dashboard-metrics/get-admin-dashboard-metrics.use-case';
import { GetPlatformStatsUseCase } from './application/use-cases/get-platform-stats/get-platform-stats.use-case';
import { ListExportFormatsUseCase } from './application/use-cases/list-export-formats/list-export-formats.use-case';
import { ListSectionTypesUseCase } from './application/use-cases/list-section-types/list-section-types.use-case';
import { ListUserRolesUseCase } from './application/use-cases/list-user-roles/list-user-roles.use-case';
import { AdminAlertsRepositoryPort } from './domain/ports/admin-alerts.repository.port';
import { AdminDashboardRepositoryPort } from './domain/ports/admin-dashboard.repository.port';
import { PlatformStatsRepositoryPort } from './domain/ports/platform-stats.repository.port';
import { SectionTypesCatalogPort } from './domain/ports/section-types.catalog.port';
import { SectionTypesCatalogAdapter } from './infrastructure/adapters/catalogs/section-types-catalog.adapter';
import { PrismaAdminAlertsRepository } from './infrastructure/adapters/persistence/prisma-admin-alerts.repository';
import { PrismaAdminDashboardRepository } from './infrastructure/adapters/persistence/prisma-admin-dashboard.repository';
import { PrismaPlatformStatsRepository } from './infrastructure/adapters/persistence/prisma-platform-stats.repository';
import { AdminAlertsController } from './infrastructure/controllers/admin-alerts.controller';
import { AdminDashboardController } from './infrastructure/controllers/admin-dashboard.controller';
import { EnumsController } from './infrastructure/controllers/enums.controller';
import { PlatformStatsController } from './infrastructure/controllers/platform-stats.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule, ResumesCoreModule],
  controllers: [
    PlatformStatsController,
    EnumsController,
    AdminDashboardController,
    AdminAlertsController,
  ],
  providers: [
    SectionTypeRepository,

    // Repository ports
    {
      provide: AdminDashboardRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAdminDashboardRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: AdminAlertsRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaAdminAlertsRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: PlatformStatsRepositoryPort,
      useFactory: (prisma: PrismaService, auth: AuthorizationService, logger: LoggerPort) =>
        new PrismaPlatformStatsRepository(prisma, auth, logger),
      inject: [PrismaService, AuthorizationService, LoggerPort],
    },
    {
      provide: SectionTypesCatalogPort,
      useFactory: (repo: SectionTypeRepository) => new SectionTypesCatalogAdapter(repo),
      inject: [SectionTypeRepository],
    },

    // Use cases
    {
      provide: GetAdminDashboardMetricsUseCase,
      useFactory: (repo: AdminDashboardRepositoryPort, logger: LoggerPort) =>
        new GetAdminDashboardMetricsUseCase(repo, logger),
      inject: [AdminDashboardRepositoryPort, LoggerPort],
    },
    {
      provide: GetAdminAlertsUseCase,
      useFactory: (repo: AdminAlertsRepositoryPort, logger: LoggerPort) =>
        new GetAdminAlertsUseCase(repo, logger),
      inject: [AdminAlertsRepositoryPort, LoggerPort],
    },
    {
      provide: GetPlatformStatsUseCase,
      useFactory: (repo: PlatformStatsRepositoryPort, logger: LoggerPort) =>
        new GetPlatformStatsUseCase(repo, logger),
      inject: [PlatformStatsRepositoryPort, LoggerPort],
    },
    {
      provide: ListExportFormatsUseCase,
      useFactory: () => new ListExportFormatsUseCase(),
    },
    {
      provide: ListUserRolesUseCase,
      useFactory: () => new ListUserRolesUseCase(),
    },
    {
      provide: ListSectionTypesUseCase,
      useFactory: (catalog: SectionTypesCatalogPort) => new ListSectionTypesUseCase(catalog),
      inject: [SectionTypesCatalogPort],
    },
  ],
  exports: [GetPlatformStatsUseCase],
})
export class PlatformModule {}
