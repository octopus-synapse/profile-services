/**
 * Pure-TS aggregator wiring for the skills-catalog parent BC. Zero
 * `@nestjs/*` imports.
 *
 * The parent doesn't add new behaviour on its own — it just bundles
 * the four sub-BC compositions (admin, skills, spoken-languages,
 * tech-skills) so the Elysia bootstrap can import them in one shot.
 */

import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import {
  type AdminCatalogUseCases,
  buildAdminCatalogUseCases,
} from './admin/admin-catalog.composition';
import { adminCatalogRoutes } from './admin/admin-catalog.routes';
import { buildSkillsUseCases, type SkillsUseCases } from './skills/skills.composition';
import { skillsRoutes } from './skills/skills.routes';
import {
  buildSpokenLanguagesService,
  type SpokenLanguagesService,
} from './spoken-languages/spoken-languages.composition';
import { spokenLanguagesRoutes } from './spoken-languages/spoken-languages.routes';
import {
  buildTechSkillsServices,
  type TechSkillsQueryService,
  type TechSkillsServices,
} from './tech-skills/tech-skills.composition';
import { techSkillsQueryRoutes, techSkillsSyncRoutes } from './tech-skills/tech-skills.routes';

export interface SkillsCatalogCompositions {
  readonly admin: {
    readonly useCases: AdminCatalogUseCases;
    readonly routes: typeof adminCatalogRoutes;
  };
  readonly skills: {
    readonly useCases: SkillsUseCases;
    readonly routes: typeof skillsRoutes;
  };
  readonly spokenLanguages: {
    readonly useCases: SpokenLanguagesService;
    readonly routes: typeof spokenLanguagesRoutes;
  };
  readonly techSkills: {
    readonly useCases: TechSkillsQueryService;
    readonly routes: typeof techSkillsQueryRoutes;
    readonly syncRoutes: typeof techSkillsSyncRoutes;
    readonly services: TechSkillsServices;
  };
}

export function buildSkillsCatalogCompositions(
  prisma: PrismaService,
  cache: CacheService,
  logger: LoggerPort,
): SkillsCatalogCompositions {
  const techSkillsServices = buildTechSkillsServices(prisma, cache, logger);

  return {
    admin: {
      useCases: buildAdminCatalogUseCases(prisma, logger),
      routes: adminCatalogRoutes,
    },
    skills: {
      useCases: buildSkillsUseCases(prisma, logger),
      routes: skillsRoutes,
    },
    spokenLanguages: {
      useCases: buildSpokenLanguagesService(prisma, cache),
      routes: spokenLanguagesRoutes,
    },
    techSkills: {
      useCases: techSkillsServices.query,
      routes: techSkillsQueryRoutes,
      syncRoutes: techSkillsSyncRoutes,
      services: techSkillsServices,
    },
  };
}
