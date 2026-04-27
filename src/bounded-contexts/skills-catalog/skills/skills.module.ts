/**
 * Skills Module
 *
 * ADR-001: 5 POJO use cases (list, list-for-resume, add, update,
 * delete) drive the controller. The Prisma adapter implements both
 * `SkillManagementPort` (the legacy listSkills() — empty stub for
 * now) and `SkillManagementRepositoryPort` (the resume-side CRUD).
 * `SkillManagementService` stays as an `application/services/`
 * facade that lets external BCs (resumes/core, etc.) keep one
 * import surface for skill operations.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { SkillManagementService } from './application/services/skill-management.service';
import { AddSkillUseCase } from './application/use-cases/add-skill/add-skill.use-case';
import { DeleteSkillUseCase } from './application/use-cases/delete-skill/delete-skill.use-case';
import { ListSkillsForResumeUseCase } from './application/use-cases/list-skills-for-resume/list-skills-for-resume.use-case';
import { ListSkillsUseCase } from './application/use-cases/list-skills/list-skills.use-case';
import { UpdateSkillUseCase } from './application/use-cases/update-skill/update-skill.use-case';
import { SkillManagementPort } from './domain/ports/skill-management.port';
import { SkillManagementRepositoryPort } from './domain/ports/skill-management.repository.port';
import { PrismaSkillManagementRepository } from './infrastructure/adapters/persistence/prisma-skill-management.repository';
import { SkillManagementController } from './infrastructure/controllers/skill-management.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SkillManagementController],
  providers: [
    {
      provide: PrismaSkillManagementRepository,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        new PrismaSkillManagementRepository(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
    { provide: SkillManagementPort, useExisting: PrismaSkillManagementRepository },
    { provide: SkillManagementRepositoryPort, useExisting: PrismaSkillManagementRepository },
    {
      provide: ListSkillsUseCase,
      useFactory: (port: SkillManagementPort) => new ListSkillsUseCase(port),
      inject: [SkillManagementPort],
    },
    {
      provide: ListSkillsForResumeUseCase,
      useFactory: (repo: SkillManagementRepositoryPort) => new ListSkillsForResumeUseCase(repo),
      inject: [SkillManagementRepositoryPort],
    },
    {
      provide: AddSkillUseCase,
      useFactory: (repo: SkillManagementRepositoryPort) => new AddSkillUseCase(repo),
      inject: [SkillManagementRepositoryPort],
    },
    {
      provide: UpdateSkillUseCase,
      useFactory: (repo: SkillManagementRepositoryPort) => new UpdateSkillUseCase(repo),
      inject: [SkillManagementRepositoryPort],
    },
    {
      provide: DeleteSkillUseCase,
      useFactory: (repo: SkillManagementRepositoryPort) => new DeleteSkillUseCase(repo),
      inject: [SkillManagementRepositoryPort],
    },
    {
      provide: SkillManagementService,
      useFactory: (
        listSkills: ListSkillsUseCase,
        listSkillsForResume: ListSkillsForResumeUseCase,
        addSkill: AddSkillUseCase,
        updateSkill: UpdateSkillUseCase,
        deleteSkill: DeleteSkillUseCase,
      ) =>
        new SkillManagementService(listSkills, listSkillsForResume, addSkill, updateSkill, deleteSkill),
      inject: [
        ListSkillsUseCase,
        ListSkillsForResumeUseCase,
        AddSkillUseCase,
        UpdateSkillUseCase,
        DeleteSkillUseCase,
      ],
    },
  ],
  exports: [SkillManagementService],
})
export class SkillsModule {}
