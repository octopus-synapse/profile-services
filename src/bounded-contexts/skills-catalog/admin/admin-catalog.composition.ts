/**
 * Pure-TS wiring for the skills-catalog/admin BC. Zero `@nestjs/*`
 * imports.
 *
 * 5 admin CRUD surfaces (tech-areas, tech-niches, tech-skills,
 * spoken-languages, programming-languages) each backed by one Prisma
 * adapter behind a dedicated port + 5 POJO use cases (list / get /
 * create / update / delete).
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { AdminCatalogUseCases } from './application/ports/admin-catalog.port';
import { CreateAdminProgrammingLanguageUseCase } from './application/use-cases/create-admin-programming-language/create-admin-programming-language.use-case';
import { CreateAdminSpokenLanguageUseCase } from './application/use-cases/create-admin-spoken-language/create-admin-spoken-language.use-case';
import { CreateAdminTechAreaUseCase } from './application/use-cases/create-admin-tech-area/create-admin-tech-area.use-case';
import { CreateAdminTechNicheUseCase } from './application/use-cases/create-admin-tech-niche/create-admin-tech-niche.use-case';
import { CreateAdminTechSkillUseCase } from './application/use-cases/create-admin-tech-skill/create-admin-tech-skill.use-case';
import { DeleteAdminProgrammingLanguageUseCase } from './application/use-cases/delete-admin-programming-language/delete-admin-programming-language.use-case';
import { DeleteAdminSpokenLanguageUseCase } from './application/use-cases/delete-admin-spoken-language/delete-admin-spoken-language.use-case';
import { DeleteAdminTechAreaUseCase } from './application/use-cases/delete-admin-tech-area/delete-admin-tech-area.use-case';
import { DeleteAdminTechNicheUseCase } from './application/use-cases/delete-admin-tech-niche/delete-admin-tech-niche.use-case';
import { DeleteAdminTechSkillUseCase } from './application/use-cases/delete-admin-tech-skill/delete-admin-tech-skill.use-case';
import { GetAdminProgrammingLanguageUseCase } from './application/use-cases/get-admin-programming-language/get-admin-programming-language.use-case';
import { GetAdminSpokenLanguageUseCase } from './application/use-cases/get-admin-spoken-language/get-admin-spoken-language.use-case';
import { GetAdminTechAreaUseCase } from './application/use-cases/get-admin-tech-area/get-admin-tech-area.use-case';
import { GetAdminTechNicheUseCase } from './application/use-cases/get-admin-tech-niche/get-admin-tech-niche.use-case';
import { GetAdminTechSkillUseCase } from './application/use-cases/get-admin-tech-skill/get-admin-tech-skill.use-case';
import { ListAdminProgrammingLanguagesUseCase } from './application/use-cases/list-admin-programming-languages/list-admin-programming-languages.use-case';
import { ListAdminSpokenLanguagesUseCase } from './application/use-cases/list-admin-spoken-languages/list-admin-spoken-languages.use-case';
import { ListAdminTechAreasUseCase } from './application/use-cases/list-admin-tech-areas/list-admin-tech-areas.use-case';
import { ListAdminTechNichesUseCase } from './application/use-cases/list-admin-tech-niches/list-admin-tech-niches.use-case';
import { ListAdminTechSkillsUseCase } from './application/use-cases/list-admin-tech-skills/list-admin-tech-skills.use-case';
import { UpdateAdminProgrammingLanguageUseCase } from './application/use-cases/update-admin-programming-language/update-admin-programming-language.use-case';
import { UpdateAdminSpokenLanguageUseCase } from './application/use-cases/update-admin-spoken-language/update-admin-spoken-language.use-case';
import { UpdateAdminTechAreaUseCase } from './application/use-cases/update-admin-tech-area/update-admin-tech-area.use-case';
import { UpdateAdminTechNicheUseCase } from './application/use-cases/update-admin-tech-niche/update-admin-tech-niche.use-case';
import { UpdateAdminTechSkillUseCase } from './application/use-cases/update-admin-tech-skill/update-admin-tech-skill.use-case';
import { PrismaAdminProgrammingLanguagesRepository } from './infrastructure/adapters/persistence/prisma-admin-programming-languages.repository';
import { PrismaAdminSpokenLanguagesRepository } from './infrastructure/adapters/persistence/prisma-admin-spoken-languages.repository';
import { PrismaAdminTechAreasRepository } from './infrastructure/adapters/persistence/prisma-admin-tech-areas.repository';
import { PrismaAdminTechNichesRepository } from './infrastructure/adapters/persistence/prisma-admin-tech-niches.repository';
import { PrismaAdminTechSkillsRepository } from './infrastructure/adapters/persistence/prisma-admin-tech-skills.repository';

export { AdminCatalogUseCases };

export function buildAdminCatalogUseCases(
  prisma: PrismaService,
  logger: LoggerPort,
): AdminCatalogUseCases {
  // Repos
  const techAreasRepo = new PrismaAdminTechAreasRepository(prisma, logger);
  const techNichesRepo = new PrismaAdminTechNichesRepository(prisma, logger);
  const techSkillsRepo = new PrismaAdminTechSkillsRepository(prisma, logger);
  const spokenLanguagesRepo = new PrismaAdminSpokenLanguagesRepository(prisma, logger);
  const programmingLanguagesRepo = new PrismaAdminProgrammingLanguagesRepository(prisma, logger);

  return {
    listAdminTechAreas: new ListAdminTechAreasUseCase(techAreasRepo),
    getAdminTechArea: new GetAdminTechAreaUseCase(techAreasRepo),
    createAdminTechArea: new CreateAdminTechAreaUseCase(techAreasRepo),
    updateAdminTechArea: new UpdateAdminTechAreaUseCase(techAreasRepo),
    deleteAdminTechArea: new DeleteAdminTechAreaUseCase(techAreasRepo),

    listAdminTechNiches: new ListAdminTechNichesUseCase(techNichesRepo),
    getAdminTechNiche: new GetAdminTechNicheUseCase(techNichesRepo),
    createAdminTechNiche: new CreateAdminTechNicheUseCase(techNichesRepo),
    updateAdminTechNiche: new UpdateAdminTechNicheUseCase(techNichesRepo),
    deleteAdminTechNiche: new DeleteAdminTechNicheUseCase(techNichesRepo),

    listAdminTechSkills: new ListAdminTechSkillsUseCase(techSkillsRepo),
    getAdminTechSkill: new GetAdminTechSkillUseCase(techSkillsRepo),
    createAdminTechSkill: new CreateAdminTechSkillUseCase(techSkillsRepo),
    updateAdminTechSkill: new UpdateAdminTechSkillUseCase(techSkillsRepo),
    deleteAdminTechSkill: new DeleteAdminTechSkillUseCase(techSkillsRepo),

    listAdminSpokenLanguages: new ListAdminSpokenLanguagesUseCase(spokenLanguagesRepo),
    getAdminSpokenLanguage: new GetAdminSpokenLanguageUseCase(spokenLanguagesRepo),
    createAdminSpokenLanguage: new CreateAdminSpokenLanguageUseCase(spokenLanguagesRepo),
    updateAdminSpokenLanguage: new UpdateAdminSpokenLanguageUseCase(spokenLanguagesRepo),
    deleteAdminSpokenLanguage: new DeleteAdminSpokenLanguageUseCase(spokenLanguagesRepo),

    listAdminProgrammingLanguages: new ListAdminProgrammingLanguagesUseCase(programmingLanguagesRepo),
    getAdminProgrammingLanguage: new GetAdminProgrammingLanguageUseCase(programmingLanguagesRepo),
    createAdminProgrammingLanguage: new CreateAdminProgrammingLanguageUseCase(programmingLanguagesRepo),
    updateAdminProgrammingLanguage: new UpdateAdminProgrammingLanguageUseCase(programmingLanguagesRepo),
    deleteAdminProgrammingLanguage: new DeleteAdminProgrammingLanguageUseCase(programmingLanguagesRepo),
  };
}
