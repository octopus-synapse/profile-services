/**
 * Skills Management Module
 *
 * Module for skill management operations with elevated permissions.
 * Uses Clean Architecture with Use Cases and Repository pattern.
 */

import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { SkillManagementController } from './controllers/skill-management.controller';
import {
  buildSkillManagementUseCases,
  SKILL_MANAGEMENT_USE_CASES,
} from './services/skill-management/skill-management.composition';
import { SkillManagementService } from './services/skill-management.service';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [SkillManagementController],
  providers: [
    {
      provide: SKILL_MANAGEMENT_USE_CASES,
      useFactory: (prisma: PrismaService) => buildSkillManagementUseCases(prisma),
      inject: [PrismaService],
    },
    SkillManagementService,
  ],
  exports: [SkillManagementService],
})
export class SkillsManagementModule {}
