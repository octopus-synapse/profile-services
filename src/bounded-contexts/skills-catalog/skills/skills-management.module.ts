/**
 * Skills Management Module
 *
 * Module for skill management operations with elevated permissions.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { SkillManagementService } from './services/skill-management.service';
import { SkillManagementController } from './controllers/skill-management.controller';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [SkillManagementController],
  providers: [SkillManagementService],
  exports: [SkillManagementService],
})
export class SkillsManagementModule {}
