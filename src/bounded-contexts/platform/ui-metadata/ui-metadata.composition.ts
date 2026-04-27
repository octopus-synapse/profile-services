/**
 * Pure-TS wiring for the ui-metadata BC. Zero `@nestjs/*` imports.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { UiMetadataUseCases } from './application/ports/ui-metadata.port';
import { GetEnumDescriptorUseCase } from './application/use-cases/get-enum-descriptor/get-enum-descriptor.use-case';
import { GetUserMenuUseCase } from './application/use-cases/get-user-menu/get-user-menu.use-case';
import { ListEnumKeysUseCase } from './application/use-cases/list-enum-keys/list-enum-keys.use-case';
import { LoadMeDashboardUseCase } from './application/use-cases/load-me-dashboard/load-me-dashboard.use-case';
import { PrismaMeDashboardRepository } from './infrastructure/adapters/persistence/prisma-me-dashboard.repository';

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
