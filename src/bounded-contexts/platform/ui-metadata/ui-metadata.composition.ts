/**
 * Pure-TS wiring for the ui-metadata BC. Zero `@nestjs/*` imports — Phase 1
 * canonical shape: returns `{ useCases, routes }` as a
 * `BoundedContextComposition`. The Elysia bootstrap concatenates this
 * with every other BC's composition.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';
import { GetEnumDescriptorUseCase } from './application/use-cases/get-enum-descriptor/get-enum-descriptor.use-case';
import { GetUserMenuUseCase } from './application/use-cases/get-user-menu/get-user-menu.use-case';
import { ListEnumKeysUseCase } from './application/use-cases/list-enum-keys/list-enum-keys.use-case';
import { LoadMeDashboardUseCase } from './application/use-cases/load-me-dashboard/load-me-dashboard.use-case';
import { PrismaMeDashboardRepository } from './infrastructure/adapters/persistence/prisma-me-dashboard.repository';
import { uiMetadataRoutes } from './ui-metadata.routes';

export { UiMetadataUseCases };

export function buildUiMetadataUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
): UiMetadataUseCases {
  const meDashboardRepo = new PrismaMeDashboardRepository(prisma, logger);

  return {
    listEnumKeys: new ListEnumKeysUseCase(),
    getEnumDescriptor: new GetEnumDescriptorUseCase(),
    getUserMenu: new GetUserMenuUseCase(meDashboardRepo, logger),
    loadMeDashboard: new LoadMeDashboardUseCase(meDashboardRepo, logger),
  };
}

export function buildUiMetadataComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<UiMetadataUseCases> {
  const useCases = buildUiMetadataUseCases(prisma, logger);

  return {
    useCases,
    routes: uiMetadataRoutes,
  };
}
