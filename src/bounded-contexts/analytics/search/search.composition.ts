/**
 * Pure-TS wiring for the search submodule. Zero `@nestjs/*` imports.
 *
 * The routes are typed against `SearchServicePort` (the existing bundle
 * token); the composition exposes a single `ResumeSearchService` POJO
 * that structurally satisfies that port. Both the Nest shell and the
 * Elysia bootstrap consume `useCases` directly.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { SearchServicePort } from './ports/search.port';
import { ResumeSearchService } from './resume-search.service';
import { searchRoutes } from './search.routes';

export { SearchServicePort };

export function buildSearchUseCases(prisma: PrismaService): SearchServicePort {
  return new ResumeSearchService(prisma);
}

export function buildSearchComposition(
  prisma: PrismaService,
): BoundedContextComposition<SearchServicePort> {
  return {
    useCases: buildSearchUseCases(prisma),
    routes: searchRoutes,
  };
}
