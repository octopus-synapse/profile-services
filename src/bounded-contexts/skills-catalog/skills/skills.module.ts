/**
 * Skills Module
 *
 * Thin Nest shell over `buildSkillsUseCases`. All wiring lives in
 * `skills.composition.ts`. The controller consumes the use-case bundle
 * directly; no application service shim is needed since this BC has
 * no external consumers.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { LoggerPort } from '@/shared-kernel';
import { SkillsUseCases } from './application/ports/skills.port';
import { SkillManagementController } from './infrastructure/controllers/skill-management.controller';
import { buildSkillsUseCases } from './skills.composition';

@Module({
  imports: [PrismaModule],
  controllers: [SkillManagementController],
  providers: [
    {
      provide: SkillsUseCases,
      useFactory: (prisma: PrismaService, logger: LoggerPort) =>
        buildSkillsUseCases(prisma, logger),
      inject: [PrismaService, LoggerPort],
    },
  ],
  exports: [SkillsUseCases],
})
export class SkillsModule {}
