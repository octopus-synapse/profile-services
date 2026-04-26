import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SkillManagementController } from './controllers/skill-management.controller';
import { SkillManagementPort } from './services/skill-management/ports/skill-management.port';
import { SkillManagementRepositoryPort } from './services/skill-management/ports/skill-management-repository.port';
import { SkillManagementRepository } from './services/skill-management/repository/skill-management.repository';
import { SkillManagementService } from './services/skill-management/skill-management.service';
import { ListSkillsUseCase } from './services/skill-management/use-cases/list-skills.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [SkillManagementController],
  providers: [
    SkillManagementRepository,
    { provide: SkillManagementPort, useExisting: SkillManagementRepository },
    { provide: SkillManagementRepositoryPort, useExisting: SkillManagementRepository },
    {
      provide: ListSkillsUseCase,
      useFactory: (port: SkillManagementPort) => new ListSkillsUseCase(port),
      inject: [SkillManagementPort],
    },
    {
      provide: SkillManagementService,
      useFactory: (
        listSkillsUseCase: ListSkillsUseCase,
        repository: SkillManagementRepositoryPort,
      ) => new SkillManagementService(listSkillsUseCase, repository),
      inject: [ListSkillsUseCase, SkillManagementRepositoryPort],
    },
  ],
  exports: [SkillManagementService],
})
export class SkillsModule {}
