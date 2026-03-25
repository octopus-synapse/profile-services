import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SkillManagementController } from './controllers/skill-management.controller';
import type { SkillManagementRepositoryPort } from './services/skill-management/ports/skill-management-repository.port';
import { SkillManagementRepository } from './services/skill-management/repository/skill-management.repository';
import { SkillManagementService } from './services/skill-management/skill-management.service';
import { ListSkillsUseCase } from './services/skill-management/use-cases/list-skills.use-case';

const SKILL_MANAGEMENT_REPOSITORY = Symbol('SkillManagementRepositoryPort');

@Module({
  imports: [PrismaModule],
  controllers: [SkillManagementController],
  providers: [
    {
      provide: SKILL_MANAGEMENT_REPOSITORY,
      useClass: SkillManagementRepository,
    },
    {
      provide: ListSkillsUseCase,
      useFactory: (repository: SkillManagementRepository) => new ListSkillsUseCase(repository),
      inject: [SKILL_MANAGEMENT_REPOSITORY],
    },
    {
      provide: SkillManagementService,
      useFactory: (
        listSkillsUseCase: ListSkillsUseCase,
        repository: SkillManagementRepositoryPort,
      ) => new SkillManagementService(listSkillsUseCase, repository),
      inject: [ListSkillsUseCase, SKILL_MANAGEMENT_REPOSITORY],
    },
  ],
  exports: [SkillManagementService],
})
export class SkillsModule {}
