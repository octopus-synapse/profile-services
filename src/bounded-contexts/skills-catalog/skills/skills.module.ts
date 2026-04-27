/**
 * Skills Module
 *
 * Thin Nest shell over `buildSkillsUseCases`. Routes are described in
 * `skills.routes.ts` and synthesized into Nest controllers at module
 * load.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import { synthesizeRouteControllers } from '@/infrastructure/nest-adapter';
import { LoggerPort } from '@/shared-kernel';
import { SkillsUseCases } from './application/ports/skills.port';
import { buildSkillsUseCases } from './skills.composition';
import { skillsRoutes } from './skills.routes';

@Module({
  imports: [PrismaModule],
  controllers: synthesizeRouteControllers(SkillsUseCases, skillsRoutes),
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
