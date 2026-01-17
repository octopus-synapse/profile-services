/**
 * Skills Management Module
 *
 * Module for skill management operations with elevated permissions.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthorizationModule } from '../authorization';
import { SkillManagementService } from './services/skill-management.service';
import { SkillManagementController } from './controllers/skill-management.controller';
import { SkillManagementRepository } from './repositories';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [SkillManagementController],
  providers: [SkillManagementService, SkillManagementRepository],
  exports: [SkillManagementService],
})
export class SkillsManagementModule {}
