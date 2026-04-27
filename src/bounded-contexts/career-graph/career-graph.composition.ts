/**
 * Pure-TS wiring for the career-graph BC. Zero `@nestjs/*` imports.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CareerGraphUseCases } from './application/ports/career-graph.port';
import { ViewCareerGraphUseCase } from './application/use-cases/view-career-graph/view-career-graph.use-case';
import { PrismaCareerCohortRepository } from './infrastructure/adapters/persistence/prisma-career-cohort.repository';

export { CareerGraphUseCases };

export function buildCareerGraphUseCases(prisma: PrismaService): CareerGraphUseCases {
  const repo = new PrismaCareerCohortRepository(prisma);

  return {
    viewCareerGraph: new ViewCareerGraphUseCase(repo),
  };
}
