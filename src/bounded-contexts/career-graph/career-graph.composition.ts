/**
 * Pure-TS wiring for the career-graph BC. Zero `@nestjs/*` imports —
 * Phase-1 canonical shape: `buildCareerGraphComposition` returns a
 * `BoundedContextComposition` that the Elysia bootstrap concatenates
 * with every other BC's composition.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { CareerGraphUseCases } from './application/ports/career-graph.port';
import { ViewCareerGraphUseCase } from './application/use-cases/view-career-graph/view-career-graph.use-case';
import { careerGraphRoutes } from './career-graph.routes';
import { PrismaCareerCohortRepository } from './infrastructure/adapters/persistence/prisma-career-cohort.repository';

export { CareerGraphUseCases };

export function buildCareerGraphUseCases(prisma: PrismaService): CareerGraphUseCases {
  const repo = new PrismaCareerCohortRepository(prisma);

  return {
    viewCareerGraph: new ViewCareerGraphUseCase(repo),
  };
}

export function buildCareerGraphComposition(
  prisma: PrismaService,
): BoundedContextComposition<CareerGraphUseCases> {
  const useCases = buildCareerGraphUseCases(prisma);

  return {
    useCases,
    routes: careerGraphRoutes,
    eventHandlers: [],
  };
}
