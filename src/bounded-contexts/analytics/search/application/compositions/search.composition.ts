/**
 * Search Composition
 *
 * Wires search use cases with their dependencies.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SearchUseCases } from '../ports/search.port';
import { SearchResumesUseCase } from '../use-cases/search-resumes/search-resumes.use-case';

export { SearchUseCases };

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
