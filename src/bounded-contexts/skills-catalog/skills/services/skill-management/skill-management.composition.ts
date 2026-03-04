import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import {
  SKILL_MANAGEMENT_USE_CASES,
  type SkillManagementUseCases,
} from './ports/skill-management.port';
import { SkillManagementRepository } from './repository/skill-management.repository';
import { AddSkillUseCase } from './use-cases/add-skill.use-case';
import { DeleteSkillUseCase } from './use-cases/delete-skill.use-case';
import { ListSkillsUseCase } from './use-cases/list-skills.use-case';
import { UpdateSkillUseCase } from './use-cases/update-skill.use-case';

export { SKILL_MANAGEMENT_USE_CASES };

export function buildSkillManagementUseCases(prisma: PrismaService): SkillManagementUseCases {
  const repository = new SkillManagementRepository(prisma);

  return {
    listSkillsUseCase: new ListSkillsUseCase(repository),
    addSkillUseCase: new AddSkillUseCase(repository),
    updateSkillUseCase: new UpdateSkillUseCase(repository),
    deleteSkillUseCase: new DeleteSkillUseCase(repository),
  };
}
