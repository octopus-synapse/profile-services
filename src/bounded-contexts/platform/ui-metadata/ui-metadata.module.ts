/**
 * UI Metadata Module
 *
 * ADR-001: 4 POJO use cases (list-enum-keys, get-enum-descriptor,
 * get-user-menu, load-me-dashboard) sit on top of
 * `MeDashboardRepositoryPort`. The Prisma adapter owns the parallel
 * fan-out across the dashboard counts; the use cases stay framework-
 * free so the same logic can be exercised from specs with the
 * in-memory port.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { GetEnumDescriptorUseCase } from './application/use-cases/get-enum-descriptor/get-enum-descriptor.use-case';
import { GetUserMenuUseCase } from './application/use-cases/get-user-menu/get-user-menu.use-case';
import { ListEnumKeysUseCase } from './application/use-cases/list-enum-keys/list-enum-keys.use-case';
import { LoadMeDashboardUseCase } from './application/use-cases/load-me-dashboard/load-me-dashboard.use-case';
import { MeDashboardRepositoryPort } from './domain/ports/me-dashboard.repository.port';
import { PrismaMeDashboardRepository } from './infrastructure/adapters/persistence/prisma-me-dashboard.repository';
import { MeDashboardController } from './infrastructure/controllers/me-dashboard.controller';
import { UiMetadataController } from './infrastructure/controllers/ui-metadata.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UiMetadataController, MeDashboardController],
  providers: [
    {
      provide: MeDashboardRepositoryPort,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaMeDashboardRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    {
      provide: ListEnumKeysUseCase,
      useFactory: () => new ListEnumKeysUseCase(),
      inject: [],
    },
    {
      provide: GetEnumDescriptorUseCase,
      useFactory: () => new GetEnumDescriptorUseCase(),
      inject: [],
    },
    {
      provide: GetUserMenuUseCase,
      useFactory: (repo: MeDashboardRepositoryPort, logger: LoggerPort) =>
        new GetUserMenuUseCase(repo, logger),
      inject: [MeDashboardRepositoryPort, LoggerPort],
    },
    {
      provide: LoadMeDashboardUseCase,
      useFactory: (repo: MeDashboardRepositoryPort, logger: LoggerPort) =>
        new LoadMeDashboardUseCase(repo, logger),
      inject: [MeDashboardRepositoryPort, LoggerPort],
    },
  ],
})
export class UiMetadataModule {}
