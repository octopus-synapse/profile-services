/**
 * Pure-TS wiring for the spoken-languages BC. Zero `@nestjs/*`
 * imports.
 *
 * The routes consume `SpokenLanguagesService` as their bundle (it
 * still owns the caching behaviour — kept until cache is folded into
 * dedicated use-cases). The composition also exposes the standalone
 * `SpokenLanguagesUseCases` bundle for non-cached callers / future
 * Elysia bootstrap consumers.
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import {
  type SpokenLanguagesRepositoryPort,
  SpokenLanguagesUseCases,
} from './application/ports/spoken-languages.port';
import { GetActiveSpokenLanguagesUseCase } from './application/use-cases/get-active-spoken-languages/get-active-spoken-languages.use-case';
import { GetSpokenLanguageByCodeUseCase } from './application/use-cases/get-spoken-language-by-code/get-spoken-language-by-code.use-case';
import { SearchSpokenLanguagesUseCase } from './application/use-cases/search-spoken-languages/search-spoken-languages.use-case';
import { SpokenLanguagesRepository } from './infrastructure/adapters/persistence/spoken-languages.repository';
import { SpokenLanguagesService } from './services/spoken-languages.service';
import { spokenLanguagesRoutes } from './spoken-languages.routes';

export { SpokenLanguagesService, SpokenLanguagesUseCases };

export function buildSpokenLanguagesRepository(
  prisma: PrismaService,
): SpokenLanguagesRepositoryPort {
  return new SpokenLanguagesRepository(prisma);
}

export function buildSpokenLanguagesUseCases(
  repository: SpokenLanguagesRepositoryPort,
): SpokenLanguagesUseCases {
  return {
    getActiveSpokenLanguagesUseCase: new GetActiveSpokenLanguagesUseCase(repository),
    searchSpokenLanguagesUseCase: new SearchSpokenLanguagesUseCase(repository),
    getSpokenLanguageByCodeUseCase: new GetSpokenLanguageByCodeUseCase(repository),
  };
}

export function buildSpokenLanguagesService(
  prisma: PrismaService,
  cache: CacheService,
): SpokenLanguagesService {
  const repo = buildSpokenLanguagesRepository(prisma);
  return new SpokenLanguagesService(repo, cache);
}

export function buildSpokenLanguagesComposition(
  prisma: PrismaService,
  cache: CacheService,
): BoundedContextComposition<SpokenLanguagesService> {
  const service = buildSpokenLanguagesService(prisma, cache);

  return {
    useCases: service,
    routes: spokenLanguagesRoutes,
  };
}
