/**
 * Pure-TS wiring for the tech-skills BC. Zero `@nestjs/*` imports.
 *
 * Two route groups feed this BC:
 *  - `techSkillsQueryRoutes` consume `TechSkillsQueryService` (a
 *    framework-free facade over five POJO query services).
 *  - `techSkillsSyncRoutes` consume `TechSkillsSyncService` (which
 *    fans out to the parser + per-entity sync POJOs).
 *
 * The Phase-1 contract returns the query bundle as the primary
 * `BoundedContextComposition.useCases`; the sync facade is exposed as
 * an extra slot via `extras` for the bootstrap to mount the sync route
 * group.
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import type { BoundedContextComposition } from '@/shared-kernel/composition';
import { CacheAdapter } from './infrastructure/adapters/persistence/cache.adapter';
import { TechSkillRepository } from './infrastructure/adapters/persistence/tech-skill.repository';
import { TechAreaQueryService } from './services/area-query.service';
import { GithubLinguistParserService } from './services/github-linguist-parser.service';
import { LanguageQueryService } from './services/language-query.service';
import { LanguagesSyncService } from './services/languages-sync.service';
import { TechNicheQueryService } from './services/niche-query.service';
import { SkillQueryService } from './services/skill-query.service';
import { SkillSearchService } from './services/skill-search.service';
import { SkillsDataSyncService } from './services/skills-data-sync.service';
import { StackOverflowParserService } from './services/stackoverflow-parser.service';
import { TechAreasSyncService } from './services/tech-areas-sync.service';
import { TechNichesSyncService } from './services/tech-niches-sync.service';
import { TechSkillsQueryService } from './services/tech-skills-query.service';
import { TechSkillsSyncService } from './services/tech-skills-sync.service';
import { techSkillsQueryRoutes, techSkillsSyncRoutes } from './tech-skills.routes';

export {
  LanguageQueryService,
  SkillQueryService,
  SkillSearchService,
  TechAreaQueryService,
  TechNicheQueryService,
  TechSkillsQueryService,
  TechSkillsSyncService,
};

export interface TechSkillsServices {
  readonly query: TechSkillsQueryService;
  readonly sync: TechSkillsSyncService;
  readonly area: TechAreaQueryService;
  readonly niche: TechNicheQueryService;
  readonly language: LanguageQueryService;
  readonly skill: SkillQueryService;
  readonly skillSearch: SkillSearchService;
}

export function buildTechSkillsServices(
  prisma: PrismaService,
  cacheService: CacheService,
  logger: LoggerPort,
): TechSkillsServices {
  // Cache adapter (port over CacheService)
  const cache = new CacheAdapter(cacheService);

  // Query services
  const area = new TechAreaQueryService(prisma, cacheService);
  const niche = new TechNicheQueryService(prisma, cacheService);
  const language = new LanguageQueryService(prisma, cacheService);
  const skillRepo = new TechSkillRepository(prisma);
  const skill = new SkillQueryService(skillRepo, cache);
  const skillSearch = new SkillSearchService(skillRepo, cache);
  const query = new TechSkillsQueryService(area, niche, language, skill, skillSearch);

  // Sync services
  const linguist = new GithubLinguistParserService(logger);
  const so = new StackOverflowParserService(logger);
  const areasSync = new TechAreasSyncService(prisma, logger);
  const nichesSync = new TechNichesSyncService(prisma, logger);
  const languagesSync = new LanguagesSyncService(prisma);
  const skillsDataSync = new SkillsDataSyncService(prisma);
  const sync = new TechSkillsSyncService(
    cacheService,
    logger,
    linguist,
    so,
    areasSync,
    nichesSync,
    languagesSync,
    skillsDataSync,
  );

  return { query, sync, area, niche, language, skill, skillSearch };
}

/**
 * Phase-1 dual-mode composition for tech-skills. The query facade is
 * exposed as `useCases` so it matches the `BoundedContextComposition`
 * shape; sync is reachable through the same `services` bag for the
 * sync route group.
 */
export function buildTechSkillsComposition(
  prisma: PrismaService,
  cacheService: CacheService,
  logger: LoggerPort,
): BoundedContextComposition<TechSkillsQueryService> & {
  readonly services: TechSkillsServices;
  readonly syncRoutes: typeof techSkillsSyncRoutes;
} {
  const services = buildTechSkillsServices(prisma, cacheService, logger);

  return {
    useCases: services.query,
    routes: techSkillsQueryRoutes,
    syncRoutes: techSkillsSyncRoutes,
    services,
  };
}
