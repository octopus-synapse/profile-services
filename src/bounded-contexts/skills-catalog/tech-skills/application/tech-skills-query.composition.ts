import type { CacheService } from '@/bounded-contexts/platform/common/cache/cache.service';
import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { CacheAdapter } from '../infrastructure/adapters/persistence/cache.adapter';
import { ProgrammingLanguageRepository } from '../infrastructure/adapters/persistence/programming-language.repository';
import { TechAreaRepository } from '../infrastructure/adapters/persistence/tech-area.repository';
import { TechNicheRepository } from '../infrastructure/adapters/persistence/tech-niche.repository';
import { TechSkillRepository } from '../infrastructure/adapters/persistence/tech-skill.repository';
import { TECH_SKILLS_USE_CASES, type TechSkillsUseCases } from './ports/tech-skills.port';
import { GetAllAreasUseCase } from './use-cases/get-all-areas/get-all-areas.use-case';
import { GetAllLanguagesUseCase } from './use-cases/get-all-languages/get-all-languages.use-case';
import { GetAllNichesUseCase } from './use-cases/get-all-niches/get-all-niches.use-case';
import { GetAllSkillsUseCase } from './use-cases/get-all-skills/get-all-skills.use-case';
import { GetNichesByAreaUseCase } from './use-cases/get-niches-by-area/get-niches-by-area.use-case';
import { GetSkillsByNicheUseCase } from './use-cases/get-skills-by-niche/get-skills-by-niche.use-case';
import { GetSkillsByTypeUseCase } from './use-cases/get-skills-by-type/get-skills-by-type.use-case';
import { SearchAllUseCase } from './use-cases/search-all/search-all.use-case';
import { SearchLanguagesUseCase } from './use-cases/search-languages/search-languages.use-case';
import { SearchSkillsUseCase } from './use-cases/search-skills/search-skills.use-case';

export { TECH_SKILLS_USE_CASES };

export function buildTechSkillsUseCases(
  prisma: PrismaService,
  cacheService: CacheService,
): TechSkillsUseCases {
  const cache = new CacheAdapter(cacheService);
  const skillRepo = new TechSkillRepository(prisma);
  const areaRepo = new TechAreaRepository(prisma);
  const nicheRepo = new TechNicheRepository(prisma);
  const langRepo = new ProgrammingLanguageRepository(prisma);

  const searchLanguagesUseCase = new SearchLanguagesUseCase(langRepo, cache);
  const searchSkillsUseCase = new SearchSkillsUseCase(skillRepo, cache);

  return {
    getAllSkillsUseCase: new GetAllSkillsUseCase(skillRepo, cache),
    getSkillsByNicheUseCase: new GetSkillsByNicheUseCase(skillRepo, cache),
    getSkillsByTypeUseCase: new GetSkillsByTypeUseCase(skillRepo),
    searchSkillsUseCase,
    getAllAreasUseCase: new GetAllAreasUseCase(areaRepo, cache),
    getAllNichesUseCase: new GetAllNichesUseCase(nicheRepo, cache),
    getNichesByAreaUseCase: new GetNichesByAreaUseCase(nicheRepo, cache),
    getAllLanguagesUseCase: new GetAllLanguagesUseCase(langRepo, cache),
    searchLanguagesUseCase,
    searchAllUseCase: new SearchAllUseCase(searchLanguagesUseCase, searchSkillsUseCase),
  };
}
