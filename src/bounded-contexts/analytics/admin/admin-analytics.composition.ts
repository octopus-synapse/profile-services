/**
 * Pure-TS wiring for the admin-analytics submodule. Zero `@nestjs/*`
 * imports. The module shell consumes `buildAdminAnalyticsUseCases` via
 * `useFactory`; the Elysia bootstrap will mount the routes against the
 * same `useCases` bundle.
 *
 * The submodule has a single use case (`GetAdminAnalyticsOverviewUseCase`)
 * which doubles as the routes' bundle token — keeping the original
 * controller's surface area unchanged.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { adminAnalyticsRoutes } from './admin-analytics.routes';
import { GetAdminAnalyticsOverviewUseCase } from './application/use-cases/get-admin-analytics-overview/get-admin-analytics-overview.use-case';
import { PrismaAdminAnalyticsRepository } from './infrastructure/adapters/persistence/prisma-admin-analytics.repository';

export { GetAdminAnalyticsOverviewUseCase };

export function buildAdminAnalyticsUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
): GetAdminAnalyticsOverviewUseCase {
  const repository = new PrismaAdminAnalyticsRepository(prisma, logger);
  return new GetAdminAnalyticsOverviewUseCase(repository);
}

export function buildAdminAnalyticsComposition(
  prisma: PrismaService,
  logger: LoggerPort,
): BoundedContextComposition<GetAdminAnalyticsOverviewUseCase> {
  return {
    useCases: buildAdminAnalyticsUseCases(prisma, logger),
    routes: adminAnalyticsRoutes,
  };
}
