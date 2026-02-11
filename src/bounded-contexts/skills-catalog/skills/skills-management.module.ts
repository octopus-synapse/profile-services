/**
 * Skills Management Module
 *
 * Module for skill management operations with elevated permissions.
 */

import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@/bounded-contexts/identity/authorization';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { SkillManagementController } from './controllers/skill-management.controller';
import { SkillManagementService } from './services/skill-management.service';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [SkillManagementController],
  providers: [SkillManagementService],
  exports: [SkillManagementService],
})
export class SkillsManagementModule {}
