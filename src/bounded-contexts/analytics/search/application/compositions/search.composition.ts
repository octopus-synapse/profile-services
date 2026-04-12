/**
 * Search Composition
 *
 * Wires search use cases with their dependencies.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SEARCH_USE_CASES, type SearchUseCases } from '../ports/search.port';
import { SearchResumesUseCase } from '../use-cases/search-resumes/search-resumes.use-case';

export { SEARCH_USE_CASES };

export function buildSearchUseCases(prisma: PrismaService): SearchUseCases {
  const searchResumesUseCase = new SearchResumesUseCase(prisma);

  return {
    searchResumesUseCase: {
      execute: (params) => searchResumesUseCase.execute(params),
      suggest: (prefix, limit) => searchResumesUseCase.suggest(prefix, limit),
      findSimilar: (resumeId, limit) => searchResumesUseCase.findSimilar(resumeId, limit),
    },
  };
}
