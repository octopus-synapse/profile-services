/**
 * Pure-TS wiring for the skills BC. Zero `@nestjs/*` imports.
 *
 * The Prisma adapter implements both `SkillManagementPort` (legacy
 * listSkills() — empty stub for now) and `SkillManagementRepositoryPort`
 * (resume-side CRUD); a single instance is shared in both roles.
 */

import type { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { LoggerPort } from '@/shared-kernel';
import { SkillsUseCases } from './application/ports/skills.port';
import { AddSkillUseCase } from './application/use-cases/add-skill/add-skill.use-case';
import { DeleteSkillUseCase } from './application/use-cases/delete-skill/delete-skill.use-case';
import { ListSkillsUseCase } from './application/use-cases/list-skills/list-skills.use-case';
import { ListSkillsForResumeUseCase } from './application/use-cases/list-skills-for-resume/list-skills-for-resume.use-case';
import { UpdateSkillUseCase } from './application/use-cases/update-skill/update-skill.use-case';
import { PrismaSkillManagementRepository } from './infrastructure/adapters/persistence/prisma-skill-management.repository';

export { SkillsUseCases };

export function buildSkillsUseCases(prisma: PrismaService, logger: LoggerPort): SkillsUseCases {
  // Repo (doubles as SkillManagementPort + SkillManagementRepositoryPort)
  const repo = new PrismaSkillManagementRepository(prisma, logger);

  return {
    listSkills: new ListSkillsUseCase(repo),
    listSkillsForResume: new ListSkillsForResumeUseCase(repo),
    addSkill: new AddSkillUseCase(repo),
    updateSkill: new UpdateSkillUseCase(repo),
    deleteSkill: new DeleteSkillUseCase(repo),
  };
}
