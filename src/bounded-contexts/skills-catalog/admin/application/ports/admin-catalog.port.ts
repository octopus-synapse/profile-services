/**
 * Bundle token for the skills-catalog/admin BC. Doubles as the
 * TypeScript shape of the use-case bag and the Nest DI token.
 * Composition lives in `admin-catalog.composition.ts` — Nest-free.
 */

import type { CreateAdminProgrammingLanguageUseCase } from '../use-cases/create-admin-programming-language/create-admin-programming-language.use-case';
import type { CreateAdminSpokenLanguageUseCase } from '../use-cases/create-admin-spoken-language/create-admin-spoken-language.use-case';
import type { CreateAdminTechAreaUseCase } from '../use-cases/create-admin-tech-area/create-admin-tech-area.use-case';
import type { CreateAdminTechNicheUseCase } from '../use-cases/create-admin-tech-niche/create-admin-tech-niche.use-case';
import type { CreateAdminTechSkillUseCase } from '../use-cases/create-admin-tech-skill/create-admin-tech-skill.use-case';
import type { DeleteAdminProgrammingLanguageUseCase } from '../use-cases/delete-admin-programming-language/delete-admin-programming-language.use-case';
import type { DeleteAdminSpokenLanguageUseCase } from '../use-cases/delete-admin-spoken-language/delete-admin-spoken-language.use-case';
import type { DeleteAdminTechAreaUseCase } from '../use-cases/delete-admin-tech-area/delete-admin-tech-area.use-case';
import type { DeleteAdminTechNicheUseCase } from '../use-cases/delete-admin-tech-niche/delete-admin-tech-niche.use-case';
import type { DeleteAdminTechSkillUseCase } from '../use-cases/delete-admin-tech-skill/delete-admin-tech-skill.use-case';
import type { GetAdminProgrammingLanguageUseCase } from '../use-cases/get-admin-programming-language/get-admin-programming-language.use-case';
import type { GetAdminSpokenLanguageUseCase } from '../use-cases/get-admin-spoken-language/get-admin-spoken-language.use-case';
import type { GetAdminTechAreaUseCase } from '../use-cases/get-admin-tech-area/get-admin-tech-area.use-case';
import type { GetAdminTechNicheUseCase } from '../use-cases/get-admin-tech-niche/get-admin-tech-niche.use-case';
import type { GetAdminTechSkillUseCase } from '../use-cases/get-admin-tech-skill/get-admin-tech-skill.use-case';
import type { ListAdminProgrammingLanguagesUseCase } from '../use-cases/list-admin-programming-languages/list-admin-programming-languages.use-case';
import type { ListAdminSpokenLanguagesUseCase } from '../use-cases/list-admin-spoken-languages/list-admin-spoken-languages.use-case';
import type { ListAdminTechAreasUseCase } from '../use-cases/list-admin-tech-areas/list-admin-tech-areas.use-case';
import type { ListAdminTechNichesUseCase } from '../use-cases/list-admin-tech-niches/list-admin-tech-niches.use-case';
import type { ListAdminTechSkillsUseCase } from '../use-cases/list-admin-tech-skills/list-admin-tech-skills.use-case';
import type { UpdateAdminProgrammingLanguageUseCase } from '../use-cases/update-admin-programming-language/update-admin-programming-language.use-case';
import type { UpdateAdminSpokenLanguageUseCase } from '../use-cases/update-admin-spoken-language/update-admin-spoken-language.use-case';
import type { UpdateAdminTechAreaUseCase } from '../use-cases/update-admin-tech-area/update-admin-tech-area.use-case';
import type { UpdateAdminTechNicheUseCase } from '../use-cases/update-admin-tech-niche/update-admin-tech-niche.use-case';
import type { UpdateAdminTechSkillUseCase } from '../use-cases/update-admin-tech-skill/update-admin-tech-skill.use-case';

export abstract class AdminCatalogUseCases {
  abstract readonly listAdminTechAreas: ListAdminTechAreasUseCase;
  abstract readonly getAdminTechArea: GetAdminTechAreaUseCase;
  abstract readonly createAdminTechArea: CreateAdminTechAreaUseCase;
  abstract readonly updateAdminTechArea: UpdateAdminTechAreaUseCase;
  abstract readonly deleteAdminTechArea: DeleteAdminTechAreaUseCase;

  abstract readonly listAdminTechNiches: ListAdminTechNichesUseCase;
  abstract readonly getAdminTechNiche: GetAdminTechNicheUseCase;
  abstract readonly createAdminTechNiche: CreateAdminTechNicheUseCase;
  abstract readonly updateAdminTechNiche: UpdateAdminTechNicheUseCase;
  abstract readonly deleteAdminTechNiche: DeleteAdminTechNicheUseCase;

  abstract readonly listAdminTechSkills: ListAdminTechSkillsUseCase;
  abstract readonly getAdminTechSkill: GetAdminTechSkillUseCase;
  abstract readonly createAdminTechSkill: CreateAdminTechSkillUseCase;
  abstract readonly updateAdminTechSkill: UpdateAdminTechSkillUseCase;
  abstract readonly deleteAdminTechSkill: DeleteAdminTechSkillUseCase;

  abstract readonly listAdminSpokenLanguages: ListAdminSpokenLanguagesUseCase;
  abstract readonly getAdminSpokenLanguage: GetAdminSpokenLanguageUseCase;
  abstract readonly createAdminSpokenLanguage: CreateAdminSpokenLanguageUseCase;
  abstract readonly updateAdminSpokenLanguage: UpdateAdminSpokenLanguageUseCase;
  abstract readonly deleteAdminSpokenLanguage: DeleteAdminSpokenLanguageUseCase;

  abstract readonly listAdminProgrammingLanguages: ListAdminProgrammingLanguagesUseCase;
  abstract readonly getAdminProgrammingLanguage: GetAdminProgrammingLanguageUseCase;
  abstract readonly createAdminProgrammingLanguage: CreateAdminProgrammingLanguageUseCase;
  abstract readonly updateAdminProgrammingLanguage: UpdateAdminProgrammingLanguageUseCase;
  abstract readonly deleteAdminProgrammingLanguage: DeleteAdminProgrammingLanguageUseCase;
}
